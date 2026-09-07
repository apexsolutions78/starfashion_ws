import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, PERMISSIONS.CATALOG_READ);
    if (!auth) {
      return ApiUtils.forbidden();
    }

    const csvHeaders = [
      'Article Number',
      'Base Price (Rs.)',
      'Product Name',
      'Description',
      'Shirt Style & Material',
      'Dupatta Style & Material',
      'Trouser Style & Material',
      'Category',
      'Collection',
      'Color',
      'Size',
      'SKU (optional - auto-generated if empty)',
      'Stock',
    ];

    const sampleRows = [
      [
        'ART-1001',
        '120.00',
        'Silk Blend Tailored Blazer',
        'Premium tailored blazer made from lightweight silk blend.',
        'Cotton Kurta',
        'Chiffon Dupatta',
        'Cambric Trouser',
        "Women's Wear",
        'Spring/Summer 2026',
        'Black',
        'S',
        '',
        '500',
      ].join(','),
      [
        'ART-1001',
        '120.00',
        'Silk Blend Tailored Blazer',
        'Premium tailored blazer made from lightweight silk blend.',
        'Cotton Kurta',
        'Chiffon Dupatta',
        'Cambric Trouser',
        "Women's Wear",
        'Spring/Summer 2026',
        'Black',
        'M',
        '',
        '500',
      ].join(','),
      [
        'ART-1001',
        '120.00',
        'Silk Blend Tailored Blazer',
        'Premium tailored blazer made from lightweight silk blend.',
        'Cotton Kurta',
        'Chiffon Dupatta',
        'Cambric Trouser',
        "Women's Wear",
        'Spring/Summer 2026',
        'White',
        'S',
        '',
        '300',
      ].join(','),
      [
        'ART-1002',
        '45.00',
        'Classic Cotton Oxford Shirt',
        'Breathable 100% organic cotton oxford shirt.',
        '',
        '',
        '',
        "Men's Wear",
        'Spring/Summer 2026',
        'Navy Blue',
        'L',
        'ART-1002-NVY-L',
        '250',
      ].join(','),
    ];

    const instructions = [
      '',
      '## INSTRUCTIONS ##',
      '',
      '1. Each row represents ONE variant (color + size combination) of a product.',
      '2. Products with multiple variants should have multiple rows with the same Article Number.',
      '3. Category, Color, Size, and Collection can be new - they will be auto-created after confirmation.',
      '4. SKU can be left empty - it will be auto-generated as: ARTICLE-COLOR-SIZE.',
      '5. Stock is the initial inventory quantity for the variant.',
      '6. All prices are in PKR (Rs.).',
      '7. Shirt Style, Dupatta Style, Trouser Style, Product Name, and Description are optional.',
    ];

    const csvContent = [
      csvHeaders.join(','),
      ...sampleRows,
      ...instructions.map(line => `"${line}"`),
    ].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="product-import-template.csv"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return ApiUtils.error('Failed to generate template');
  }
}
