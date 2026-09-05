import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/middleware-auth';
import { ApiUtils } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session || session.userType !== 'ADMIN') {
      return ApiUtils.forbidden();
    }

    const csvHeaders = [
      'Article Number',
      'Product Name',
      'Slug',
      'Description',
      'Category',
      'Collection',
      'Base Price',
      'Color',
      'Size',
      'SKU (optional - auto-generated if empty)',
      'Stock',
    ];

    const sampleRows = [
      [
        'ART-1001',
        'Silk Blend Tailored Blazer',
        'silk-blend-tailored-blazer',
        'Premium tailored blazer made from lightweight silk blend.',
        "Women's Wear",
        'Spring/Summer 2026',
        '120.00',
        'Black',
        'S',
        '',
        '500',
      ].join(','),
      [
        'ART-1001',
        'Silk Blend Tailored Blazer',
        'silk-blend-tailored-blazer',
        'Premium tailored blazer made from lightweight silk blend.',
        "Women's Wear",
        'Spring/Summer 2026',
        '120.00',
        'Black',
        'M',
        '',
        '500',
      ].join(','),
      [
        'ART-1001',
        'Silk Blend Tailored Blazer',
        'silk-blend-tailored-blazer',
        'Premium tailored blazer made from lightweight silk blend.',
        "Women's Wear",
        'Spring/Summer 2026',
        '120.00',
        'White',
        'S',
        '',
        '300',
      ].join(','),
      [
        'ART-1002',
        'Classic Cotton Oxford Shirt',
        'classic-cotton-oxford-shirt',
        'Breathable 100% organic cotton oxford shirt.',
        "Men's Wear",
        'Spring/Summer 2026',
        '45.00',
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
      '3. Category and Collection must match existing names in the system.',
      '4. Color must match existing color names (Black, White, Navy Blue, Emerald Green).',
      '5. Size must match existing size names (S, M, L, XL).',
      '6. SKU can be left empty - it will be auto-generated as: ARTICLE-COLOR-SIZE.',
      '7. Stock is the initial inventory quantity for the variant.',
      '8. All prices are in EUR.',
      '',
      '## EXISTING CATEGORIES ##',
      "Women's Wear",
      "Men's Wear",
      '',
      '## EXISTING COLLECTIONS ##',
      'Spring/Summer 2026',
      '',
      '## EXISTING COLORS ##',
      'Black (#000000)',
      'White (#FFFFFF)',
      'Navy Blue (#000080)',
      'Emerald Green (#008000)',
      '',
      '## EXISTING SIZES ##',
      'S',
      'M',
      'L',
      'XL',
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
