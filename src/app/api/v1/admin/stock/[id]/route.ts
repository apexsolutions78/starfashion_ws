import { NextRequest } from 'next/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// PATCH update variant production status, estimated availability, and add stock
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.STOCK_MANAGE);
    if (!auth) return ApiUtils.forbidden();

    const { id } = await params;
    const body = await request.json();
    const { inProduction, estimatedAvailability, addStock, locationCode } = body;

    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, articleNumber: true } },
        color: { select: { name: true } },
        size: { select: { name: true } },
      },
    });

    if (!variant) {
      return ApiUtils.notFound('Variant not found');
    }

    // Update variant fields
    const updateData: any = {};
    if (typeof inProduction === 'boolean') {
      updateData.inProduction = inProduction;
    }
    if (estimatedAvailability !== undefined) {
      updateData.estimatedAvailability = estimatedAvailability ? new Date(estimatedAvailability) : null;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.productVariant.update({
        where: { id },
        data: updateData,
      });
    }

    // Add stock if provided
    let inventory = null;
    if (addStock && typeof addStock === 'number' && addStock > 0) {
      // Find or create inventory location
      let location = null;
      if (locationCode) {
        location = await prisma.inventoryLocation.findUnique({ where: { code: locationCode } });
      }
      if (!location) {
        location = await prisma.inventoryLocation.findFirst({ where: { active: true } });
      }

      if (!location) {
        return ApiUtils.error('No inventory location found. Please create a warehouse first.');
      }

      // Upsert inventory record
      inventory = await prisma.inventory.upsert({
        where: {
          variantId_locationId: {
            variantId: id,
            locationId: location.id,
          },
        },
        update: {
          onHand: { increment: addStock },
        },
        create: {
          variantId: id,
          locationId: location.id,
          onHand: addStock,
          reserved: 0,
        },
      });

      // Audit log
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
            addedQty: addStock,
            location: location.name,
          }),
        },
      });
    }

    // Fetch updated variant
    const updated = await prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, articleNumber: true } },
        color: { select: { name: true, hexCode: true } },
        size: { select: { name: true } },
        inventory: true,
      },
    });

    return ApiUtils.success(updated);
  } catch (error: any) {
    console.error('Error updating stock:', error);
    return ApiUtils.error(error.message || 'Failed to update stock');
  }
}
