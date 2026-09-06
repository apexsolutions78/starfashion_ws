import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { prisma } from '@/lib/db';

// GET customer addresses
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) return ApiUtils.unauthorized();

    const customerUser = await prisma.customerUser.findFirst({
      where: { userId: session.userId },
    });

    if (!customerUser) return ApiUtils.notFound('Customer not found');

    const addresses = await prisma.address.findMany({
      where: { customerId: customerUser.customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return ApiUtils.success(addresses);
  } catch (error: any) {
    console.error('Error fetching addresses:', error);
    return ApiUtils.error(error.message || 'Failed to fetch addresses');
  }
}

// POST create address
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) return ApiUtils.unauthorized();

    const customerUser = await prisma.customerUser.findFirst({
      where: { userId: session.userId },
    });

    if (!customerUser) return ApiUtils.notFound('Customer not found');

    const body = await request.json();
    const { type, addressLine1, addressLine2, city, state, postalCode, country, contactName, contactPhone, isDefault } = body;

    if (!addressLine1 || !city || !postalCode || !contactName) {
      return ApiUtils.error('addressLine1, city, postalCode, and contactName are required');
    }

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: customerUser.customerId, type: type || 'SHIPPING', isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        customerId: customerUser.customerId,
        type: type || 'SHIPPING',
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state: state || null,
        postalCode,
        country: country || 'Pakistan',
        contactName,
        contactPhone: contactPhone || null,
        isDefault: isDefault || false,
      },
    });

    return ApiUtils.success(address, 'Address created');
  } catch (error: any) {
    console.error('Error creating address:', error);
    return ApiUtils.error(error.message || 'Failed to create address');
  }
}

// PUT update address
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) return ApiUtils.unauthorized();

    const customerUser = await prisma.customerUser.findFirst({
      where: { userId: session.userId },
    });

    if (!customerUser) return ApiUtils.notFound('Customer not found');

    const body = await request.json();
    const { id, type, addressLine1, addressLine2, city, state, postalCode, country, contactName, contactPhone, isDefault } = body;

    if (!id) return ApiUtils.error('Address ID is required');

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: { id, customerId: customerUser.customerId },
    });

    if (!existing) return ApiUtils.notFound('Address not found');

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { customerId: customerUser.customerId, type: type || existing.type, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        type: type || existing.type,
        addressLine1: addressLine1 || existing.addressLine1,
        addressLine2: addressLine2 !== undefined ? addressLine2 : existing.addressLine2,
        city: city || existing.city,
        state: state !== undefined ? state : existing.state,
        postalCode: postalCode || existing.postalCode,
        country: country || existing.country,
        contactName: contactName || existing.contactName,
        contactPhone: contactPhone !== undefined ? contactPhone : existing.contactPhone,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      },
    });

    return ApiUtils.success(address, 'Address updated');
  } catch (error: any) {
    console.error('Error updating address:', error);
    return ApiUtils.error(error.message || 'Failed to update address');
  }
}

// DELETE address
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session) return ApiUtils.unauthorized();

    const customerUser = await prisma.customerUser.findFirst({
      where: { userId: session.userId },
    });

    if (!customerUser) return ApiUtils.notFound('Customer not found');

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return ApiUtils.error('Address ID is required');

    const existing = await prisma.address.findFirst({
      where: { id, customerId: customerUser.customerId },
    });

    if (!existing) return ApiUtils.notFound('Address not found');

    await prisma.address.delete({ where: { id } });

    return ApiUtils.success(null, 'Address deleted');
  } catch (error: any) {
    console.error('Error deleting address:', error);
    return ApiUtils.error(error.message || 'Failed to delete address');
  }
}
