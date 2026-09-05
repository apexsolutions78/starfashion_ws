import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthUtils } from '@/lib/auth';
import { ApiUtils } from '@/lib/api-response';
import { z } from 'zod';

const registerSchema = z.object({
  // Business info
  companyName: z.string().min(1, 'Business name is required'),
  contactName: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  // Account info
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (existingUser) {
      return ApiUtils.error('Email already registered', 409);
    }

    // Check if company name already exists
    const existingCompany = await prisma.customerCompany.findFirst({
      where: { companyName: parsed.companyName },
    });

    if (existingCompany) {
      return ApiUtils.error('Business name already registered', 409);
    }

    // Hash password
    const passwordHash = await AuthUtils.hashPassword(parsed.password);

    // Create user and company in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create User with PENDING approval
      const user = await tx.user.create({
        data: {
          email: parsed.email,
          passwordHash,
          firstName: parsed.contactName.split(' ')[0] || parsed.contactName,
          lastName: parsed.contactName.split(' ').slice(1).join(' ') || '',
          phone: parsed.phone,
          userType: 'CUSTOMER',
          status: 'ACTIVE',
          approvalStatus: 'PENDING',
        },
      });

      // Create CustomerCompany with PENDING approval and "Due on Order" payment terms
      const company = await tx.customerCompany.create({
        data: {
          companyName: parsed.companyName,
          contactName: parsed.contactName,
          phone: parsed.phone,
          city: parsed.city,
          country: parsed.country,
          status: 'ACTIVE',
          onboardingStatus: 'PENDING_APPROVAL',
          paymentTermsId: 'term-due-on-order',
          creditLimit: 0,
        },
      });

      // Link User to Company
      await tx.customerUser.create({
        data: {
          customerId: company.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      return { user, company };
    });

    return ApiUtils.success(
      {
        userId: result.user.id,
        companyId: result.company.id,
        email: result.user.email,
        companyName: result.company.companyName,
      },
      'Registration submitted. Pending admin approval.'
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiUtils.error(error.errors[0].message, 400);
    }
    console.error('Registration error:', error);
    return ApiUtils.error('Registration failed', 500);
  }
}
