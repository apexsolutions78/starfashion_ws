import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiUtils } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const collectionId = searchParams.get('collectionId') || undefined;

    const where: any = { active: true };

    if (query) {
      where.OR = [
        { name: { contains: query } },
        { articleNumber: { contains: query } },
        { description: { contains: query } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (collectionId) where.collectionId = collectionId;

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        collection: true,
        images: true,
        variants: {
          where: { active: true },
          include: {
            color: true,
            size: true,
            inventory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
    const collections = await prisma.collection.findMany({ where: { active: true } });

    return ApiUtils.success({
      products,
      categories,
      collections,
    });
  } catch (error: any) {
    return ApiUtils.error(error.message || 'Failed to fetch catalogue', 500);
  }
}
