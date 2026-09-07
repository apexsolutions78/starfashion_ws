import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can manage sales users');
    }

    const salesUsers = await prisma.user.findMany({
      where: { role: 'SALES', department: 'SALES' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { salesAssignments: true },
        },
        salesPermission: true,
        salesCommissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiUtils.success({ salesUsers });
  } catch (error) {
    console.error('Error fetching sales users:', error);
    return ApiUtils.error('Failed to fetch sales users');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can create sales users');
    }

    const body = await request.json();
    const { email, password, firstName, lastName, phone } = body;

    if (!email || !password || !firstName || !lastName) {
      return ApiUtils.error('Email, password, first name, and last name are required');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return ApiUtils.error('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        userType: 'ADMIN',
        role: 'SALES',
        department: 'SALES',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.userId,
        actorEmail: session.email,
        action: 'SALES_USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        afterJson: JSON.stringify(user),
      },
    });

    return ApiUtils.success(user, 'Sales user created successfully', 201);
  } catch (error) {
    console.error('Error creating sales user:', error);
    return ApiUtils.error('Failed to create sales user');
  }
}
