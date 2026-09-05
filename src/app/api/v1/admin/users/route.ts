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

    // Get current user to check role
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    const users = await prisma.user.findMany({
      where: { userType: 'ADMIN' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return ApiUtils.success({ users, currentUserRole: currentUser?.role });
  } catch (error) {
    console.error('Error fetching users:', error);
    return ApiUtils.error('Failed to fetch users');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    // Check if current user is MASTER_ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can create users');
    }

    const body = await request.json();
    const { email, password, firstName, lastName, phone, role } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return ApiUtils.error('Email, password, first name, and last name are required');
    }

    // Validate role
    if (role && !['MASTER_ADMIN', 'ADMIN', 'USER'].includes(role)) {
      return ApiUtils.error('Invalid role');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return ApiUtils.error('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: phone || null,
        userType: 'ADMIN',
        role: role || 'USER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return ApiUtils.success(user, 'User created successfully');
  } catch (error) {
    console.error('Error creating user:', error);
    return ApiUtils.error('Failed to create user');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    // Check if current user is MASTER_ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can edit users');
    }

    const body = await request.json();
    const { id, email, firstName, lastName, phone, role, status, password } = body;

    if (!id) {
      return ApiUtils.error('User ID is required');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return ApiUtils.notFound('User not found');
    }

    // Cannot edit MASTER_ADMIN unless you are MASTER_ADMIN
    if (existingUser.role === 'MASTER_ADMIN' && currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Cannot edit Master Admin');
    }

    // Validate role
    if (role && !['MASTER_ADMIN', 'ADMIN', 'USER'].includes(role)) {
      return ApiUtils.error('Invalid role');
    }

    // Check if email already exists for another user
    if (email) {
      const emailTaken = await prisma.user.findFirst({
        where: { email, id: { not: id } },
      });
      if (emailTaken) {
        return ApiUtils.error('Email already exists');
      }
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ApiUtils.success(user, 'User updated successfully');
  } catch (error) {
    console.error('Error updating user:', error);
    return ApiUtils.error('Failed to update user');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    // Check if current user is MASTER_ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    });

    if (currentUser?.role !== 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Only Master Admin can delete users');
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return ApiUtils.error('User ID is required');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!existingUser) {
      return ApiUtils.notFound('User not found');
    }

    // Cannot delete MASTER_ADMIN
    if (existingUser.role === 'MASTER_ADMIN') {
      return ApiUtils.forbidden('Cannot delete Master Admin');
    }

    // Cannot delete yourself
    if (userId === session.userId) {
      return ApiUtils.forbidden('Cannot delete your own account');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return ApiUtils.success(null, 'User deleted successfully');
  } catch (error) {
    console.error('Error deleting user:', error);
    return ApiUtils.error('Failed to delete user');
  }
}
