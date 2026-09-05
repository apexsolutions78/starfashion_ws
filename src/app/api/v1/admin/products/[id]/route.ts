import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { z } from 'zod';

const updateProductSchema = z.object({
  articleNumber: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  collectionId: z.string().optional(),
  basePrice: z.number().positive().optional(),
  active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        collection: true,
        variants: {
          include: {
            color: true,
            size: true,
            inventory: {
              include: {
                location: true,
              },
            },
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      return ApiUtils.notFound('Product not found');
    }

    const colors = await prisma.color.findMany({ orderBy: { name: 'asc' } });
    const sizes = await prisma.size.findMany({ orderBy: { sortOrder: 'asc' } });
    const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    const collections = await prisma.collection.findMany({ orderBy: { createdAt: 'desc' } });

    return ApiUtils.success({
      product,
      colors,
      sizes,
      categories,
      collections,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return ApiUtils.error('Failed to fetch product');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const result = updateProductSchema.safeParse(body);

    if (!result.success) {
      return ApiUtils.error('Validation failed: ' + result.error.issues.map(i => i.message).join(', '));
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return ApiUtils.notFound('Product not found');
    }

    const product = await prisma.product.update({
      where: { id },
      data: result.data,
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

    return ApiUtils.success(product, 'Product updated successfully');
  } catch (error) {
    console.error('Error updating product:', error);
    if ((error as any).code === 'P2002') {
      return ApiUtils.error('A product with this article number or slug already exists');
    }
    return ApiUtils.error('Failed to update product');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const { id } = await params;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return ApiUtils.notFound('Product not found');
    }

    const orderItemCount = await prisma.orderItem.count({
      where: {
        variant: {
          productId: id,
        },
      },
    });

    if (orderItemCount > 0) {
      return ApiUtils.error('Cannot delete product with existing orders. Consider deactivating it instead.');
    }

    await prisma.inventory.deleteMany({
      where: { variant: { productId: id } },
    });

    await prisma.productVariant.deleteMany({
      where: { productId: id },
    });

    await prisma.productImage.deleteMany({
      where: { productId: id },
    });

    await prisma.product.delete({
      where: { id },
    });

    return ApiUtils.success(null, 'Product deleted successfully');
  } catch (error) {
    console.error('Error deleting product:', error);
    return ApiUtils.error('Failed to delete product');
  }
}
