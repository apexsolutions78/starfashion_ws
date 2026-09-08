import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';
import { z } from 'zod';

const createVariantSchema = z.object({
  colorId: z.string().min(1, 'Color is required'),
  sizeId: z.string().min(1, 'Size is required'),
  sku: z.string().optional(),
  stock: z.number().int().min(0).optional().default(0),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return ApiUtils.notFound('Product not found');

    const body = await request.json();
    const result = createVariantSchema.safeParse(body);
    if (!result.success) {
      return ApiUtils.error('Validation failed: ' + result.error.issues.map(i => i.message).join(', '));
    }

    const { colorId, sizeId, sku, stock } = result.data;

    const color = await prisma.color.findUnique({ where: { id: colorId } });
    if (!color) return ApiUtils.error('Color not found');

    const size = await prisma.size.findUnique({ where: { id: sizeId } });
    if (!size) return ApiUtils.error('Size not found');

    const existingVariant = await prisma.productVariant.findFirst({
      where: { productId: id, colorId, sizeId },
    });
    if (existingVariant) {
      return ApiUtils.error('A variant with this color and size combination already exists');
    }

    const generatedSku = sku || `${product.articleNumber}-${color.name.substring(0, 3).toUpperCase()}-${size.name}`;

    const skuExists = await prisma.productVariant.findUnique({ where: { sku: generatedSku } });
    if (skuExists) {
      return ApiUtils.error(`SKU "${generatedSku}" already exists. Please provide a unique SKU.`);
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        colorId,
        sizeId,
        sku: generatedSku,
      },
      include: {
        color: true,
        size: true,
        inventory: true,
      },
    });

    if (stock > 0) {
      const warehouse = await prisma.inventoryLocation.findFirst({
        where: { code: 'WH-CENTRAL' },
      });
      if (warehouse) {
        await prisma.inventory.create({
          data: {
            variantId: variant.id,
            locationId: warehouse.id,
            onHand: stock,
            reserved: 0,
            reorderLevel: 50,
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: auth.session.userId,
        actorEmail: auth.session.email,
        action: 'VARIANT_CREATED',
        entityType: 'ProductVariant',
        entityId: variant.id,
        afterJson: JSON.stringify(variant),
      },
    });

    return ApiUtils.success(variant, 'Variant created successfully');
  } catch (error) {
    console.error('Error creating variant:', error);
    return ApiUtils.error('Failed to create variant');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');

    if (!variantId) {
      return ApiUtils.error('variantId query parameter is required');
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { inventory: true },
    });

    if (!variant || variant.productId !== id) {
      return ApiUtils.notFound('Variant not found for this product');
    }

    const orderItem = await prisma.orderItem.findFirst({
      where: { variantId },
    });
    if (orderItem) {
      return ApiUtils.error('Cannot delete variant with existing order items. Deactivate it instead.');
    }

    await prisma.inventory.deleteMany({ where: { variantId } });

    await prisma.productVariant.delete({ where: { id: variantId } });

    await prisma.auditLog.create({
      data: {
        actorId: auth.session.userId,
        actorEmail: auth.session.email,
        action: 'VARIANT_DELETED',
        entityType: 'ProductVariant',
        entityId: variantId,
        beforeJson: JSON.stringify(variant),
      },
    });

    return ApiUtils.success(null, 'Variant deleted successfully');
  } catch (error) {
    console.error('Error deleting variant:', error);
    return ApiUtils.error('Failed to delete variant');
  }
}
