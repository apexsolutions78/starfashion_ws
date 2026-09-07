import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ApiUtils } from '@/lib/api-response';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return ApiUtils.notFound('Product not found');
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const colorId = formData.get('colorId') as string | null;

    if (!files || files.length === 0) {
      return ApiUtils.error('No images provided');
    }

    // Validate colorId if provided
    if (colorId) {
      const color = await prisma.color.findUnique({
        where: { id: colorId },
      });
      if (!color) {
        return ApiUtils.error('Invalid color selected');
      }
    }

    if (files.length > 10) {
      return ApiUtils.error('Maximum 10 images allowed per upload');
    }

    const uploadDir = join(process.cwd(), 'public', 'images', 'products');
    await mkdir(uploadDir, { recursive: true });

    const createdImages = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" is not a JPEG/PNG image`);
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`"${file.name}" has invalid extension`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        errors.push(`"${file.name}" exceeds 3MB limit (${sizeMB}MB)`);
        continue;
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = join(uploadDir, fileName);

      await writeFile(filePath, buffer);

      const imagePath = `/images/products/${fileName}`;

      const existingImageCount = await prisma.productImage.count({
        where: { productId: id },
      });

      const image = await prisma.productImage.create({
        data: {
          productId: id,
          colorId: colorId || null,
          imagePath,
          isPrimary: existingImageCount === 0,
          sortOrder: existingImageCount,
        },
      });

      createdImages.push(image);
    }

    if (errors.length > 0 && createdImages.length === 0) {
      return ApiUtils.error(errors.join('. '));
    }

    const message = errors.length > 0
      ? `${createdImages.length} images uploaded. Skipped: ${errors.join(', ')}`
      : `${createdImages.length} images uploaded successfully`;

    return ApiUtils.success(createdImages, message);
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
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

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

    // Delete the file from disk
    const filePath = join(process.cwd(), 'public', image.imagePath);
    try {
      await unlink(filePath);
    } catch (e) {
      // File might not exist, continue anyway
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
