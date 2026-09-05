import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { z } from 'zod';

const createProductSchema = z.object({
  articleNumber: z.string().min(1, 'Article number is required'),
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  collectionId: z.string().optional(),
  basePrice: z.number().positive('Base price must be positive'),
  variants: z.array(z.object({
    colorId: z.string(),
    sizeId: z.string(),
    sku: z.string(),
    stock: z.number().int().min(0).default(0),
  })).optional(),
  images: z.array(z.object({
    imagePath: z.string(),
    isPrimary: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  })).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const collectionId = searchParams.get('collectionId') || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { articleNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (collectionId) {
      where.collectionId = collectionId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        collection: true,
        variants: {
          include: {
            color: true,
            size: true,
            inventory: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const collections = await prisma.collection.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const colors = await prisma.color.findMany({
      orderBy: { name: 'asc' },
    });

    const sizes = await prisma.size.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return ApiUtils.success({
      products,
      categories,
      collections,
      colors,
      sizes,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return ApiUtils.error('Failed to fetch products');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const body = await request.json();
    const result = createProductSchema.safeParse(body);

    if (!result.success) {
      return ApiUtils.error('Validation failed: ' + result.error.issues.map(i => i.message).join(', '));
    }

    const { variants, images, ...productData } = result.data;

    const product = await prisma.product.create({
      data: productData,
    });

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        const createdVariant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            colorId: variant.colorId,
            sizeId: variant.sizeId,
            sku: variant.sku,
          },
        });

        if (variant.stock > 0) {
          const warehouse = await prisma.inventoryLocation.findFirst({
            where: { code: 'WH-CENTRAL' },
          });

          if (warehouse) {
            await prisma.inventory.create({
              data: {
                variantId: createdVariant.id,
                locationId: warehouse.id,
                onHand: variant.stock,
                reserved: 0,
                reorderLevel: 50,
              },
            });
          }
        }
      }
    }

    if (images && images.length > 0) {
      for (const image of images) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            ...image,
          },
        });
      }
    }

    const createdProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        collection: true,
        variants: {
          include: {
            color: true,
            size: true,
            inventory: true,
          },
        },
        images: true,
      },
    });

    return ApiUtils.success(createdProduct, 'Product created successfully');
  } catch (error) {
    console.error('Error creating product:', error);
    if ((error as any).code === 'P2002') {
      return ApiUtils.error('A product with this article number or slug already exists');
    }
    return ApiUtils.error('Failed to create product');
  }
}
