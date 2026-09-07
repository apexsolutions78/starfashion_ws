import { NextRequest } from 'next/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// POST bulk add stock to multiple variants
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.STOCK_MANAGE);
    if (!auth) return ApiUtils.forbidden();

    const body = await request.json();
    const { items, locationCode } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return ApiUtils.error('Items array is required');
    }

    // Find location
    let location = null;
    if (locationCode) {
      location = await prisma.inventoryLocation.findUnique({ where: { code: locationCode } });
    }
    if (!location) {
      location = await prisma.inventoryLocation.findFirst({ where: { active: true } });
    }

    if (!location) {
      return ApiUtils.error('No inventory location found');
    }

    const results = [];

    for (const item of items) {
      const { variantId, quantity } = item;

      if (!variantId || typeof quantity !== 'number' || quantity <= 0) continue;

      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: { product: { select: { name: true, articleNumber: true } }, color: { select: { name: true } }, size: { select: { name: true } } },
      });

      if (!variant) continue;

      const inventory = await prisma.inventory.upsert({
        where: {
          variantId_locationId: {
            variantId,
            locationId: location.id,
          },
        },
        update: {
          onHand: { increment: quantity },
        },
        create: {
          variantId,
          locationId: location.id,
          onHand: quantity,
          reserved: 0,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: auth.session.userId,
          actorEmail: auth.session.email,
          action: 'STOCK_ADDED',
          entityType: 'Inventory',
          entityId: inventory.id,
          afterJson: JSON.stringify({
            variantSku: variant.sku,
            productName: variant.product.name,
            articleNumber: variant.product.articleNumber,
            color: variant.color.name,
            size: variant.size.name,
            addedQty: quantity,
            location: location.name,
          }),
        },
      });

      results.push({
        variantId,
        sku: variant.sku,
        addedQty: quantity,
        newTotal: inventory.onHand,
      });
    }

    return ApiUtils.success({ updated: results.length, results });
  } catch (error: any) {
    console.error('Error bulk updating stock:', error);
    return ApiUtils.error(error.message || 'Failed to update stock');
  }
}
