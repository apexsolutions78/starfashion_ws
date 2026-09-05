import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';

interface ProductRow {
  articleNumber: string;
  name: string;
  slug: string;
  description: string;
  categoryName: string;
  collectionName: string;
  basePrice: number;
  colorName: string;
  sizeName: string;
  sku: string;
  stock: number;
}

function parseCSV(csvContent: string): ProductRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim());

  const dataLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('"##') && !trimmed.startsWith('##');
  });

  const rows: ProductRow[] = [];

  for (let i = 1; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line || line.startsWith('"')) continue;

    const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));

    if (columns.length < 11) continue;

    const stockValue = parseInt(columns[10]) || 0;
    if (stockValue < 0) continue;

    rows.push({
      articleNumber: columns[0],
      name: columns[1],
      slug: columns[2],
      description: columns[3],
      categoryName: columns[4],
      collectionName: columns[5],
      basePrice: parseFloat(columns[6]) || 0,
      colorName: columns[7],
      sizeName: columns[8],
      sku: columns[9],
      stock: stockValue,
    });
  }

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const body = await request.json();
    const { csvContent, createCategories } = body;

    if (!csvContent) {
      return ApiUtils.error('No CSV content provided');
    }

    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return ApiUtils.error('No valid data rows found in the CSV file');
    }

    const categories = await prisma.category.findMany();
    const collections = await prisma.collection.findMany();
    const colors = await prisma.color.findMany();
    const sizes = await prisma.size.findMany();

    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));
    const collectionMap = new Map(collections.map(c => [c.name.toLowerCase(), c.id]));
    const colorMap = new Map(colors.map(c => [c.name.toLowerCase(), c.id]));
    const sizeMap = new Map(sizes.map(s => [s.name.toLowerCase(), s.id]));

    // Detect new categories
    const newCategoryNames = new Set<string>();
    for (const row of rows) {
      const existingCategory = categoryMap.get(row.categoryName.toLowerCase());
      if (!existingCategory && row.categoryName) {
        newCategoryNames.add(row.categoryName);
      }
    }

    // If there are new categories and user hasn't confirmed creation, return them
    if (newCategoryNames.size > 0 && !createCategories) {
      return ApiUtils.success({
        requiresConfirmation: true,
        newCategories: Array.from(newCategoryNames),
        totalRows: rows.length,
      }, 'New categories found. Confirmation required.');
    }

    // Create new categories if confirmed
    const createdCategories: { name: string; id: string }[] = [];
    if (createCategories && newCategoryNames.size > 0) {
      for (const categoryName of newCategoryNames) {
        const slug = categoryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const newCategory = await prisma.category.create({
          data: {
            name: categoryName,
            slug,
            active: true,
          },
        });

        categoryMap.set(categoryName.toLowerCase(), newCategory);
        createdCategories.push({ name: categoryName, id: newCategory.id });
      }
    }

    const warehouse = await prisma.inventoryLocation.findFirst({
      where: { code: 'WH-CENTRAL' },
    });

    const results = {
      total: rows.length,
      created: 0,
      variantsCreated: 0,
      skipped: 0,
      categoriesCreated: createdCategories.map(c => c.name),
      errors: [] as string[],
    };

    const productMap = new Map<string, string>();

    for (const row of rows) {
      try {
        const category = categoryMap.get(row.categoryName.toLowerCase());
        if (!category) {
          results.errors.push(`Row ${results.created + results.skipped + 1}: Category "${row.categoryName}" not found`);
          results.skipped++;
          continue;
        }

        const colorId = colorMap.get(row.colorName.toLowerCase());
        if (!colorId) {
          results.errors.push(`Row ${results.created + results.skipped + 1}: Color "${row.colorName}" not found`);
          results.skipped++;
          continue;
        }

        const sizeId = sizeMap.get(row.sizeName.toLowerCase());
        if (!sizeId) {
          results.errors.push(`Row ${results.created + results.skipped + 1}: Size "${row.sizeName}" not found`);
          results.skipped++;
          continue;
        }

        if (row.basePrice <= 0) {
          results.errors.push(`Row ${results.created + results.skipped + 1}: Invalid price "${row.basePrice}"`);
          results.skipped++;
          continue;
        }

        let productId = productMap.get(row.articleNumber);

        if (!productId) {
          const existingProduct = await prisma.product.findUnique({
            where: { articleNumber: row.articleNumber },
          });

          if (existingProduct) {
            productId = existingProduct.id;
          } else {
            const collectionId = collectionMap.get(row.collectionName.toLowerCase()) || null;

            const product = await prisma.product.create({
              data: {
                articleNumber: row.articleNumber,
                name: row.name,
                slug: row.slug,
                description: row.description || null,
                categoryId: category.id,
                collectionId,
                basePrice: row.basePrice,
              },
            });

            productId = product.id;
            results.created++;
          }

          productMap.set(row.articleNumber, productId);
        }

        const sku = row.sku || `${row.articleNumber}-${row.colorName.substring(0, 3).toUpperCase()}-${row.sizeName}`;

        const existingVariant = await prisma.productVariant.findUnique({
          where: { sku },
        });

        if (!existingVariant) {
          const variant = await prisma.productVariant.create({
            data: {
              productId,
              colorId,
              sizeId,
              sku,
            },
          });

          if (row.stock > 0 && warehouse) {
            await prisma.inventory.create({
              data: {
                variantId: variant.id,
                locationId: warehouse.id,
                onHand: row.stock,
                reserved: 0,
                reorderLevel: 50,
              },
            });
          }

          results.variantsCreated++;
        }
      } catch (error) {
        results.errors.push(`Row ${results.created + results.skipped + 1}: ${error}`);
        results.skipped++;
      }
    }

    return ApiUtils.success(results, `Import completed: ${results.created} products created, ${results.variantsCreated} variants created`);
  } catch (error) {
    console.error('Error importing products:', error);
    return ApiUtils.error('Failed to import products');
  }
}
