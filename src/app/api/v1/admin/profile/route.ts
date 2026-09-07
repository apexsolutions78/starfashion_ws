import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.SETTINGS_READ);
    if (!auth) return ApiUtils.forbidden();

    const user = await prisma.user.findUnique({
      where: { id: auth.session.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        userType: true,
        role: true,
        department: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return ApiUtils.notFound('User not found');
    }

    return ApiUtils.success(user);
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return ApiUtils.error('Failed to fetch profile');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.SETTINGS_MANAGE);
    if (!auth) return ApiUtils.forbidden();

    const body = await request.json();
    const { firstName, lastName, email, phone, currentPassword, newPassword } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return ApiUtils.error('First name, last name, and email are required');
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: auth.session.userId },
      },
    });

    if (existingUser) {
      return ApiUtils.error('Email is already taken by another user');
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return ApiUtils.error('Current password is required to set a new password');
      }

      const user = await prisma.user.findUnique({
        where: { id: auth.session.userId },
        select: { passwordHash: true },
      });

      if (!user) {
        return ApiUtils.error('User not found');
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return ApiUtils.error('Current password is incorrect');
      }

      if (newPassword.length < 8) {
        return ApiUtils.error('New password must be at least 8 characters');
      }
    }

    // Update profile
    const updateData: any = {
      firstName,
      lastName,
      email,
      phone: phone || null,
    };

    // Hash new password if provided
    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.session.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        userType: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return ApiUtils.success(updatedUser, 'Profile updated successfully');
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return ApiUtils.error('Failed to update profile');
  }
}
