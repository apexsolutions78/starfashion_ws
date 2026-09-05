import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateTiersSchema = z.object({
  tiers: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string(),
      minQuantity: z.number().int().min(1),
      discountPercent: z.number().min(0).max(100),
      active: z.boolean().default(true),
    })
  ),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  const tiers = await prisma.pricingTier.findMany({
    orderBy: { minQuantity: 'asc' },
  });

  return ApiUtils.success(tiers);
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  try {
    const body = await req.json();
    const parsed = updateTiersSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const beforeTiers = await tx.pricingTier.findMany();

      // Upsert tiers
      const updatedTiers = [];
      for (const tierData of parsed.tiers) {
        if (tierData.id) {
          const updated = await tx.pricingTier.update({
            where: { id: tierData.id },
            data: {
              name: tierData.name,
              minQuantity: tierData.minQuantity,
              discountPercent: tierData.discountPercent,
              active: tierData.active,
            },
          });
          updatedTiers.push(updated);
        } else {
          const created = await tx.pricingTier.create({
            data: {
              name: tierData.name,
              minQuantity: tierData.minQuantity,
              discountPercent: tierData.discountPercent,
              active: tierData.active,
            },
          });
          updatedTiers.push(created);
        }
      }

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          actorEmail: session.email,
          action: 'PRICING_TIERS_UPDATED',
          entityType: 'PricingTier',
          entityId: 'GLOBAL_TIERS',
          beforeJson: JSON.stringify(beforeTiers),
          afterJson: JSON.stringify(updatedTiers),
        },
      });

      return updatedTiers;
    });

    return ApiUtils.success(result, 'Pricing tiers updated successfully');
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    return ApiUtils.error(error.message || 'Failed to update pricing tiers', 500);
  }
}
