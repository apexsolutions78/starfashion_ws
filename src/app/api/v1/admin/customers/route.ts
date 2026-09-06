import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createCustomerSchema = z.object({
  companyName: z.string().min(1),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  creditLimit: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  const customers = await prisma.customerCompany.findMany({
    include: {
      paymentTerms: true,
      customerUsers: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
      orders: { select: { id: true, grandTotal: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ApiUtils.success(customers);
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  try {
    const body = await req.json();
    const parsed = createCustomerSchema.parse(body);

    const customer = await prisma.customerCompany.create({
      data: {
        companyName: parsed.companyName,
        taxId: parsed.taxId,
        registrationNumber: parsed.registrationNumber,
        creditLimit: parsed.creditLimit,
        notes: parsed.notes,
        status: 'ACTIVE',
      },
    });

    // Create cart for new customer
    await prisma.cart.create({
      data: { customerId: customer.id },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'CUSTOMER_COMPANY_CREATED',
        entityType: 'CustomerCompany',
        entityId: customer.id,
        afterJson: JSON.stringify(customer),
      },
    });

    return ApiUtils.success(customer, 'Customer company created', 201);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    return ApiUtils.error(error.message || 'Failed to create customer', 500);
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAuthSession(req);
  if (!session || session.userType !== 'ADMIN') {
    return ApiUtils.forbidden('Admin authorization required');
  }

  try {
    const body = await req.json();
    const { id, creditLimit, paymentTermsId, minOrderQty, status } = body;

    if (!id) {
      return ApiUtils.error('Customer ID is required', 400);
    }

    const updateData: any = {};
    if (creditLimit !== undefined) updateData.creditLimit = parseFloat(creditLimit) || 0;
    if (minOrderQty !== undefined) updateData.minOrderQty = parseInt(minOrderQty) || 30;
    if (status !== undefined) updateData.status = status;
    if (paymentTermsId !== undefined) {
      // Ensure payment term exists, create if needed
      let termExists = await prisma.paymentTerm.findUnique({ where: { id: paymentTermsId } });
      if (!termExists) {
        termExists = await prisma.paymentTerm.create({
          data: {
            id: paymentTermsId,
            name: paymentTermsId === 'term-due-on-order' ? 'Due on Order' : paymentTermsId,
            daysDue: 0,
            description: '100% advance payment required before order processing',
          },
        });
      }
      updateData.paymentTermsId = paymentTermsId;
    }

    const customer = await prisma.customerCompany.update({
      where: { id },
      data: updateData,
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'CUSTOMER_COMPANY_UPDATED',
        entityType: 'CustomerCompany',
        entityId: id,
        afterJson: JSON.stringify(updateData),
      },
    });

    return ApiUtils.success(customer, 'Customer updated successfully');
  } catch (error: any) {
    return ApiUtils.error(error.message || 'Failed to update customer', 500);
  }
}
