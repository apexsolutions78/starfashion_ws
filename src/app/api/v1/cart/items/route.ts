import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateCartItemsSchema = z.object({
  items: z.array(
    z.object({
      variantId: z.string(),
      quantity: z.number().int().min(0),
    })
  ),
});

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || !session.customerId) {
    return ApiUtils.unauthorized('Customer authentication required');
  }

  try {
    const body = await req.json();
    const parsed = updateCartItemsSchema.parse(body);

    let cart = await prisma.cart.findUnique({
      where: { customerId: session.customerId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { customerId: session.customerId },
      });
    }

    // Process matrix batch items
    for (const item of parsed.items) {
      if (item.quantity <= 0) {
        // Remove item if quantity is 0
        await prisma.cartItem.deleteMany({
          where: {
            cartId: cart.id,
            variantId: item.variantId,
          },
        });
      } else {
        // Upsert cart item
        await prisma.cartItem.upsert({
          where: {
            cartId_variantId: {
              cartId: cart.id,
              variantId: item.variantId,
            },
          },
          update: { quantity: item.quantity },
          create: {
            cartId: cart.id,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        });
      }
    }

    return ApiUtils.success({ message: 'Cart updated successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    return ApiUtils.error(error.message || 'Failed to update cart', 500);
  }
}
