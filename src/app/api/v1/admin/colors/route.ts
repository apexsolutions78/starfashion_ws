import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { ApiUtils } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_READ);
    if (!auth) return ApiUtils.forbidden();

    const colors = await prisma.color.findMany({ orderBy: { name: 'asc' } });
    return ApiUtils.success(colors);
  } catch (error) {
    console.error('Error fetching colors:', error);
    return ApiUtils.error('Failed to fetch colors');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const body = await request.json();
    const { name, hexCode } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return ApiUtils.error('Color name is required');
    }

    const existing = await prisma.color.findFirst({ where: { name: name.trim() } });
    if (existing) {
      return ApiUtils.error('A color with this name already exists');
    }

    const normalizedHex = hexCode && hexCode.startsWith('#') ? hexCode : generateHexCode(name.trim());

    const color = await prisma.color.create({
      data: {
        name: name.trim(),
        hexCode: normalizedHex,
      },
    });

    return ApiUtils.success(color, 'Color created successfully', 201);
  } catch (error) {
    console.error('Error creating color:', error);
    return ApiUtils.error('Failed to create color');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_WRITE);
    if (!auth) return ApiUtils.forbidden();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return ApiUtils.error('Color ID is required');
    }

    const color = await prisma.color.findUnique({ where: { id } });
    if (!color) {
      return ApiUtils.notFound('Color not found');
    }

    const variantCount = await prisma.productVariant.count({ where: { colorId: id } });
    if (variantCount > 0) {
      return ApiUtils.error(`Cannot delete: ${variantCount} variant(s) use this color`);
    }

    await prisma.color.delete({ where: { id } });
    return ApiUtils.success(null, 'Color deleted successfully');
  } catch (error) {
    console.error('Error deleting color:', error);
    return ApiUtils.error('Failed to delete color');
  }
}

function generateHexCode(colorName: string): string {
  const colorMap: Record<string, string> = {
    'red': '#FF0000', 'blue': '#0000FF', 'green': '#008000', 'yellow': '#FFFF00',
    'orange': '#FFA500', 'purple': '#800080', 'pink': '#FFC0CB', 'brown': '#A52A2A',
    'gray': '#808080', 'grey': '#808080', 'beige': '#F5F5DC', 'maroon': '#800000',
    'navy': '#000080', 'teal': '#008080', 'olive': '#808000', 'lime': '#00FF00',
    'aqua': '#00FFFF', 'silver': '#C0C0C0', 'gold': '#FFD700', 'coral': '#FF7F50',
    'salmon': '#FA8072', 'khaki': '#F0E68C', 'plum': '#DDA0DD', 'violet': '#EE82EE',
    'indigo': '#4B0082', 'turquoise': '#40E0D0', 'crimson': '#DC143C', 'lavender': '#E6E6FA',
    'charcoal': '#36454F', 'mustard': '#FFDB58', 'rust': '#B7410E', 'burgundy': '#800020',
    'camel': '#C19A6B', 'cream': '#FFFDD0', 'copper': '#B87333', 'denim': '#1560BD',
    'emerald': '#50C878', 'fuchsia': '#FF00FF', 'mauve': '#E0B0FF', 'mint': '#98FF98',
    'peach': '#FFE5B4', 'sage': '#BCB88A', 'taupe': '#483C32', 'wine': '#722F37',
    'black': '#000000', 'white': '#FFFFFF',
  };
  const normalized = colorName.toLowerCase().trim();
  if (colorMap[normalized]) return colorMap[normalized];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hex = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '000000'.substring(0, 6 - hex.length) + hex;
}
