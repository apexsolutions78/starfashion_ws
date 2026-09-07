import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_READ);
    if (!auth) return ApiUtils.forbidden();

    const collections = await prisma.collection.findMany({ orderBy: { createdAt: 'desc' } });
    return ApiUtils.success(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return ApiUtils.error('Failed to fetch collections');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const body = await request.json();
    const { name, season, year } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiUtils.error('Collection name is required');
    }

    const existing = await prisma.collection.findFirst({ where: { name: name.trim() } });
    if (existing) {
      return ApiUtils.error('A collection with this name already exists');
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        season: season || null,
        year: year || null,
      },
    });

    return ApiUtils.success(collection, 'Collection created successfully', 201);
  } catch (error) {
    console.error('Error creating collection:', error);
    return ApiUtils.error('Failed to create collection');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiUtils.error('Collection ID is required');
    }

    const collection = await prisma.collection.findUnique({ where: { id } });
    if (!collection) {
      return ApiUtils.notFound('Collection not found');
    }

    const productCount = await prisma.product.count({ where: { collectionId: id } });
    if (productCount > 0) {
      return ApiUtils.error(`Cannot delete: ${productCount} product(s) use this collection`);
    }

    await prisma.collection.delete({ where: { id } });
    return ApiUtils.success(null, 'Collection deleted successfully');
  } catch (error) {
    console.error('Error deleting collection:', error);
    return ApiUtils.error('Failed to delete collection');
  }
}
