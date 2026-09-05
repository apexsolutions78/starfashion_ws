import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { PricingEngine } from '@/services/PricingEngine';

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || !session.customerId) {
    return ApiUtils.unauthorized('Customer authentication required');
  }

  try {
    let cart = await prisma.cart.findUnique({
      where: { customerId: session.customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                color: true,
                size: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { customerId: session.customerId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                  color: true,
                  size: true,
                  inventory: true,
                },
              },
            },
          },
        },
      });
    }

    // Fetch active tiers
    const tiers = await prisma.pricingTier.findMany({
      where: { active: true },
      orderBy: { minQuantity: 'desc' },
    });

    // Calculate quote
    const pricingInputs = cart.items.map((item) => ({
      variantId: item.variant.id,
      sku: item.variant.sku,
      articleNumber: item.variant.product.articleNumber,
      productName: item.variant.product.name,
      colorName: item.variant.color.name,
      sizeName: item.variant.size.name,
      baseUnitPrice: item.variant.product.basePrice,
      quantity: item.quantity,
      isEligibleForTier: true,
    }));

    const quote = PricingEngine.calculateQuote(pricingInputs, tiers);

    return ApiUtils.success({
      cartId: cart.id,
      items: cart.items,
      quote,
    });
  } catch (error: any) {
    return ApiUtils.error(error.message || 'Failed to fetch cart', 500);
  }
}
