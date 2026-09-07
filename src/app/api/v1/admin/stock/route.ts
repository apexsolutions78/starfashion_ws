import { NextRequest } from 'next/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// GET all variants with stock info (searchable)
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.STOCK_READ);
    if (!auth) return ApiUtils.forbidden();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const inProduction = searchParams.get('inProduction');
    const lowStock = searchParams.get('lowStock');

    const where: any = {};

    if (search) {
      where.OR = [
        { sku: { contains: search } },
        { product: { name: { contains: search } } },
        { product: { articleNumber: { contains: search } } },
        { color: { name: { contains: search } } },
      ];
    }

    if (inProduction === 'true') {
      where.inProduction = true;
    } else if (inProduction === 'false') {
      where.inProduction = false;
    }

    const variants = await prisma.productVariant.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, articleNumber: true, basePrice: true },
        },
        color: { select: { id: true, name: true, hexCode: true } },
        size: { select: { id: true, name: true } },
        inventory: {
          select: { onHand: true, reserved: true, location: { select: { name: true, code: true } } },
        },
      },
      orderBy: { product: { articleNumber: 'asc' } },
    });

    // Calculate totals and filter low stock
    const enriched = variants.map((v) => {
      const totalStock = v.inventory.reduce((sum, inv) => sum + inv.onHand, 0);
      const totalReserved = v.inventory.reduce((sum, inv) => sum + inv.reserved, 0);
      const available = totalStock - totalReserved;
      return {
        id: v.id,
        sku: v.sku,
        productId: v.productId,
        productName: v.product.name,
        articleNumber: v.product.articleNumber,
        basePrice: v.product.basePrice,
        color: v.color,
        size: v.size,
        inProduction: v.inProduction,
        estimatedAvailability: v.estimatedAvailability,
        totalStock,
        totalReserved,
        available,
        inventory: v.inventory,
      };
    });

    let filtered = enriched;
    if (lowStock === 'true') {
      filtered = enriched.filter((v) => v.available <= 10 && !v.inProduction);
    }

    return ApiUtils.success(filtered);
  } catch (error: any) {
    console.error('Error fetching stock:', error);
    return ApiUtils.error(error.message || 'Failed to fetch stock');
  }
}
