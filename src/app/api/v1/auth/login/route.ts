import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthUtils } from '@/lib/auth';
import { ApiUtils } from '@/lib/api-response';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: parsed.email },
      include: {
        customerUsers: {
          include: { customer: true },
        },
      },
    });

    if (!user) {
      return ApiUtils.error('Invalid email or password', 401);
    }

    if (user.status !== 'ACTIVE') {
      return ApiUtils.error('User account is suspended or inactive', 403);
    }

    // Check approval status for customer users
    if (user.userType === 'CUSTOMER' && user.approvalStatus !== 'APPROVED') {
      if (user.approvalStatus === 'PENDING') {
        return ApiUtils.error('Your account is pending approval. Please wait for admin approval.', 403);
      }
      if (user.approvalStatus === 'REJECTED') {
        return ApiUtils.error(`Your account has been rejected. ${user.rejectionReason || 'Please contact support.'}`, 403);
      }
    }

    const isValid = await AuthUtils.comparePassword(parsed.password, user.passwordHash);
    if (!isValid) {
      return ApiUtils.error('Invalid email or password', 401);
    }

    // Determine Customer Company mapping if customer user
    let customerId: string | undefined = undefined;
    let companyName: string | undefined = undefined;
    let role: string | undefined = undefined;

    if (user.userType === 'CUSTOMER' && user.customerUsers.length > 0) {
      const primaryLink = user.customerUsers[0];
      customerId = primaryLink.customerId;
      companyName = primaryLink.customer.companyName;
      role = primaryLink.role;
    }

    const sessionPayload = {
      userId: user.id,
      email: user.email,
      userType: user.userType as 'ADMIN' | 'CUSTOMER',
      customerId,
      companyName,
      role,
    };

    const token = AuthUtils.signToken(sessionPayload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          customerId,
          companyName,
          role,
        },
      },
    });

    // Set HTTP-Only auth cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    return ApiUtils.error(error.message || 'Login failed', 500);
  }
}
