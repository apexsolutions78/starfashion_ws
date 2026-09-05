import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return ApiUtils.notFound('Product not found');
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return ApiUtils.error('No images provided');
    }

    const uploadDir = join(process.cwd(), 'public', 'images', 'products');
    await mkdir(uploadDir, { recursive: true });

    const createdImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) {
        continue;
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${crypto.randomUUID()}.${fileExtension}`;
      const filePath = join(uploadDir, fileName);

      await writeFile(filePath, buffer);

      const imagePath = `/images/products/${fileName}`;

      const existingImageCount = await prisma.productImage.count({
        where: { productId: id },
      });

      const image = await prisma.productImage.create({
        data: {
          productId: id,
          imagePath,
          isPrimary: existingImageCount === 0,
          sortOrder: existingImageCount,
        },
      });

      createdImages.push(image);
    }

    return ApiUtils.success(createdImages, `${createdImages.length} images uploaded successfully`);
  } catch (error) {
    console.error('Error uploading images:', error);
    return ApiUtils.error('Failed to upload images');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return ApiUtils.error('Image ID is required');
    }

    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.productId !== id) {
      return ApiUtils.notFound('Image not found');
    }

    await prisma.productImage.delete({
      where: { id: imageId },
    });

    return ApiUtils.success(null, 'Image deleted successfully');
  } catch (error) {
    console.error('Error deleting image:', error);
    return ApiUtils.error('Failed to delete image');
  }
}
