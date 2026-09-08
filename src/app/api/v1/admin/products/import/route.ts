import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

interface ProductRow {
  articleNumber: string;
  name: string;
  description: string;
  shirtStyle: string;
  dupattaStyle: string;
  trouserStyle: string;
  categoryName: string;
  collectionName: string;
  basePrice: number;
  colorName: string;
  sizeName: string;
  sku: string;
  stock: number;
}

function parseCSVLine(line: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  columns.push(current.trim());
  return columns;
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

    const columns = parseCSVLine(line);

    // New format: 13 cols (Article, Price, Name, Description, ShirtStyle, DupattaStyle, TrouserStyle, Category, Collection, Color, Size, SKU, Stock)
    // New format without SKU: 12 cols
    // Legacy format (11 cols with slug): Article, Name, Slug, Desc, Category, Collection, Price, Color, Size, SKU, Stock
    // Legacy format (10 cols without slug): Article, Name, Desc, Category, Collection, Price, Color, Size, SKU, Stock
    if (columns.length < 10) continue;

    // Detect format by checking if column 1 looks like a price (number) vs a name (text)
    const col1AsPrice = parseFloat(columns[1]);
    const isNewFormat = !isNaN(col1AsPrice) && col1AsPrice > 0 && columns.length >= 12;

    if (isNewFormat) {
      // New format: Article, Price, Name, Description, ShirtStyle, DupattaStyle, TrouserStyle, Category, Collection, Color, Size, [SKU], Stock
      const stockIdx = columns.length >= 13 ? 12 : 11;
      const stockValue = parseInt(columns[stockIdx]) || 0;
      if (stockValue < 0) continue;

      rows.push({
        articleNumber: columns[0],
        name: columns[2] || '',
        description: columns[3] || '',
        shirtStyle: columns[4] || '',
        dupattaStyle: columns[5] || '',
        trouserStyle: columns[6] || '',
        categoryName: columns[7],
        collectionName: columns[8],
        basePrice: parseFloat(columns[1]) || 0,
        colorName: columns[9],
        sizeName: columns[10],
        sku: columns.length >= 13 ? columns[11] : '',
        stock: stockValue,
      });
    } else {
      // Legacy format detection
      const hasSlug = columns.length >= 11 && !isNaN(parseFloat(columns[5]));
      const offset = hasSlug ? 1 : 0;

      const stockValue = parseInt(columns[9 + offset]) || 0;
      if (stockValue < 0) continue;

      rows.push({
        articleNumber: columns[0],
        name: columns[1],
        description: hasSlug ? columns[3] : columns[2],
        shirtStyle: '',
        dupattaStyle: '',
        trouserStyle: '',
        categoryName: hasSlug ? columns[4] : columns[3],
        collectionName: hasSlug ? columns[5] : columns[4],
        basePrice: parseFloat(hasSlug ? columns[6] : columns[5]) || 0,
        colorName: hasSlug ? columns[7] : columns[6],
        sizeName: hasSlug ? columns[8] : columns[7],
        sku: hasSlug ? columns[9] : columns[8],
        stock: stockValue,
      });
    }
  }

  return rows;
}

function generateHexCode(colorName: string): string {
  const colorMap: Record<string, string> = {
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'brown': '#A52A2A',
    'gray': '#808080',
    'grey': '#808080',
    'beige': '#F5F5DC',
    'maroon': '#800000',
    'navy': '#000080',
    'teal': '#008080',
    'olive': '#808000',
    'lime': '#00FF00',
    'aqua': '#00FFFF',
    'silver': '#C0C0C0',
    'gold': '#FFD700',
    'coral': '#FF7F50',
    'salmon': '#FA8072',
    'khaki': '#F0E68C',
    'plum': '#DDA0DD',
    'violet': '#EE82EE',
    'indigo': '#4B0082',
    'turquoise': '#40E0D0',
    'crimson': '#DC143C',
    'lavender': '#E6E6FA',
    'charcoal': '#36454F',
    'mustard': '#FFDB58',
    'rust': '#B7410E',
    'burgundy': '#800020',
    'camel': '#C19A6B',
    'cream': '#FFFDD0',
    'copper': '#B87333',
    'denim': '#1560BD',
    'emerald': '#50C878',
    'fuchsia': '#FF00FF',
    'mauve': '#E0B0FF',
    'mint': '#98FF98',
    'peach': '#FFE5B4',
    'sage': '#BCB88A',
    'taupe': '#483C32',
    'wine': '#722F37',
  };

  const normalized = colorName.toLowerCase().trim();
  if (colorMap[normalized]) {
    return colorMap[normalized];
  }

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hex = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '000000'.substring(0, 6 - hex.length) + hex;
}

function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateCollectionSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateSizeSortOrder(sizeName: string): number {
  const sizeOrder: Record<string, number> = {
    'xxs': 1,
    'xs': 2,
    's': 3,
    'small': 3,
    'm': 4,
    'medium': 4,
    'l': 5,
    'large': 5,
    'xl': 6,
    'xxl': 7,
    'xxxl': 8,
    'xxxxl': 9,
    'one size': 10,
    'os': 10,
    '2xl': 7,
    '3xl': 8,
    '4xl': 9,
    '5xl': 10,
  };

  return sizeOrder[sizeName.toLowerCase()] || 100;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) {
      return ApiUtils.forbidden();
    }

    const body = await request.json();
    const { csvContent, createCategories, createColors, createSizes, createCollections } = body;

    if (!csvContent) {
      return ApiUtils.error('No CSV content provided');
    }

    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return ApiUtils.error('No valid data rows found in the CSV file');
    }

    // Fetch existing data
    const categories = await prisma.category.findMany();
    const collections = await prisma.collection.findMany();
    const colors = await prisma.color.findMany();
    const sizes = await prisma.size.findMany();

    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c]));
    const collectionMap = new Map(collections.map(c => [c.name.toLowerCase(), c]));
    const colorMap = new Map(colors.map(c => [c.name.toLowerCase(), c]));
    const sizeMap = new Map(sizes.map(s => [s.name.toLowerCase(), s]));

    // Detect new entries
    const newCategoryNames = new Set<string>();
    const newColorNames = new Set<string>();
    const newSizeNames = new Set<string>();
    const newCollectionNames = new Set<string>();

    for (const row of rows) {
      if (row.categoryName && !categoryMap.has(row.categoryName.toLowerCase())) {
        newCategoryNames.add(row.categoryName);
      }
      if (row.colorName && !colorMap.has(row.colorName.toLowerCase())) {
        newColorNames.add(row.colorName);
      }
      if (row.sizeName && !sizeMap.has(row.sizeName.toLowerCase())) {
        newSizeNames.add(row.sizeName);
      }
      if (row.collectionName && !collectionMap.has(row.collectionName.toLowerCase())) {
        newCollectionNames.add(row.collectionName);
      }
    }

    // Check if confirmation needed
    const needsCategoryConfirm = newCategoryNames.size > 0 && !createCategories;
    const needsColorConfirm = newColorNames.size > 0 && !createColors;
    const needsSizeConfirm = newSizeNames.size > 0 && !createSizes;
    const needsCollectionConfirm = newCollectionNames.size > 0 && !createCollections;

    if (needsCategoryConfirm || needsColorConfirm || needsSizeConfirm || needsCollectionConfirm) {
      return ApiUtils.success({
        requiresConfirmation: true,
        newCategories: Array.from(newCategoryNames),
        newColors: Array.from(newColorNames),
        newSizes: Array.from(newSizeNames),
        newCollections: Array.from(newCollectionNames),
        totalRows: rows.length,
      }, 'New entries found. Confirmation required.');
    }

    // Create new categories if confirmed
    const createdCategories: string[] = [];
    if (createCategories && newCategoryNames.size > 0) {
      for (const name of newCategoryNames) {
        const newCategory = await prisma.category.create({
          data: {
            name,
            slug: generateCategorySlug(name),
            active: true,
          },
        });
        categoryMap.set(name.toLowerCase(), newCategory);
        createdCategories.push(name);
      }
    }

    // Create new colors if confirmed
    const createdColors: string[] = [];
    if (createColors && newColorNames.size > 0) {
      for (const name of newColorNames) {
        const newColor = await prisma.color.create({
          data: {
            name,
            hexCode: generateHexCode(name),
            active: true,
          },
        });
        colorMap.set(name.toLowerCase(), newColor);
        createdColors.push(name);
      }
    }

    // Create new sizes if confirmed
    const createdSizes: string[] = [];
    if (createSizes && newSizeNames.size > 0) {
      for (const name of newSizeNames) {
        const newSize = await prisma.size.create({
          data: {
            name,
            sortOrder: generateSizeSortOrder(name),
            active: true,
          },
        });
        sizeMap.set(name.toLowerCase(), newSize);
        createdSizes.push(name);
      }
    }

    // Create new collections if confirmed
    const createdCollections: string[] = [];
    if (createCollections && newCollectionNames.size > 0) {
      for (const name of newCollectionNames) {
        const newCollection = await prisma.collection.create({
          data: {
            name,
            active: true,
          },
        });
        collectionMap.set(name.toLowerCase(), newCollection);
        createdCollections.push(name);
      }
    }

    // Process products
    const warehouse = await prisma.inventoryLocation.findFirst({
      where: { code: 'WH-CENTRAL' },
    });

    const results = {
      total: rows.length,
      created: 0,
      variantsCreated: 0,
      skipped: 0,
      categoriesCreated: createdCategories,
      colorsCreated: createdColors,
      sizesCreated: createdSizes,
      collectionsCreated: createdCollections,
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

        const color = colorMap.get(row.colorName.toLowerCase());
        if (!color) {
          results.errors.push(`Row ${results.created + results.skipped + 1}: Color "${row.colorName}" not found`);
          results.skipped++;
          continue;
        }

        const size = sizeMap.get(row.sizeName.toLowerCase());
        if (!size) {
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
            const collection = row.collectionName
              ? collectionMap.get(row.collectionName.toLowerCase())
              : null;

            // Auto-generate slug from article number (unique since articleNumber is unique)
            const slug = row.articleNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const product = await prisma.product.create({
              data: {
                articleNumber: row.articleNumber,
                name: row.name || null,
                slug,
                description: row.description || null,
                shirtStyle: row.shirtStyle || null,
                dupattaStyle: row.dupattaStyle || null,
                trouserStyle: row.trouserStyle || null,
                categoryId: category.id,
                collectionId: collection?.id || null,
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
              colorId: color.id,
              sizeId: size.id,
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
