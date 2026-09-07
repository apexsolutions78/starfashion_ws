import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_READ);
    if (!auth) return ApiUtils.forbidden();

    const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    return ApiUtils.success(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return ApiUtils.error('Failed to fetch categories');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiUtils.error('Category name is required');
    }

    const existing = await prisma.category.findFirst({ where: { name: name.trim() } });
    if (existing) {
      return ApiUtils.error('A category with this name already exists');
    }

    const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        sortOrder: (maxSort._max.sortOrder || 0) + 1,
      },
    });

    return ApiUtils.success(category, 'Category created successfully', 201);
  } catch (error) {
    console.error('Error creating category:', error);
    return ApiUtils.error('Failed to create category');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiUtils.error('Category ID is required');
    }

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return ApiUtils.notFound('Category not found');
    }

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return ApiUtils.error(`Cannot delete: ${productCount} product(s) use this category`);
    }

    await prisma.category.delete({ where: { id } });
    return ApiUtils.success(null, 'Category deleted successfully');
  } catch (error) {
    console.error('Error deleting category:', error);
    return ApiUtils.error('Failed to delete category');
  }
}
