import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting StarFashion Wholesale Database Seed...');

  // 1. Seed System Settings
  const defaultSettings = [
    { key: 'system_currency', value: 'EUR', dataType: 'STRING', description: 'Base wholesale currency' },
    { key: 'system_currency_symbol', value: 'Rs.', dataType: 'STRING', description: 'Currency symbol' },
    { key: 'reserve_stock_on', value: 'SUBMITTED', dataType: 'STRING', description: 'Inventory reservation policy' },
    { key: 'enforce_credit_limit', value: 'true', dataType: 'BOOLEAN', description: 'Block orders exceeding credit limit' },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting,
    });
  }
  console.log('✅ System Settings seeded.');

  // 2. Seed Payment Terms
  const dueOnOrder = await prisma.paymentTerm.upsert({
    where: { id: 'term-due-on-order' },
    update: {},
    create: { id: 'term-due-on-order', name: 'Due on Order', daysDue: 0, description: '100% advance payment required before order processing' },
  });
  const net30 = await prisma.paymentTerm.upsert({
    where: { id: 'term-net-30' },
    update: {},
    create: { id: 'term-net-30', name: 'Net 30', daysDue: 30, description: 'Payment due within 30 days of invoice' },
  });
  await prisma.paymentTerm.upsert({
    where: { id: 'term-net-60' },
    update: {},
    create: { id: 'term-net-60', name: 'Net 60', daysDue: 60, description: 'Payment due within 60 days of invoice' },
  });
  await prisma.paymentTerm.upsert({
    where: { id: 'term-immediate' },
    update: {},
    create: { id: 'term-immediate', name: 'Immediate', daysDue: 0, description: 'Payment due immediately upon receipt' },
  });
  console.log('✅ Payment terms seeded.');

  // 3. Seed Baseline Configurable Pricing Tiers
  const defaultTiers = [
    { id: 'tier-1', name: 'Tier 1 (30+)', minQuantity: 30, discountPercent: 10.0, sortOrder: 1 },
    { id: 'tier-2', name: 'Tier 2 (70+)', minQuantity: 70, discountPercent: 12.0, sortOrder: 2 },
    { id: 'tier-3', name: 'Tier 3 (101+)', minQuantity: 101, discountPercent: 15.0, sortOrder: 3 },
  ];

  for (const tier of defaultTiers) {
    await prisma.pricingTier.upsert({
      where: { minQuantity: tier.minQuantity },
      update: tier,
      create: tier,
    });
  }
  console.log('✅ Wholesale Pricing Tiers seeded (30+=10%, 70+=12%, 101+=15%).');

  // 4. Seed Roles & Permissions
  const permissions = [
    { code: 'catalog:read', description: 'View product catalog' },
    { code: 'catalog:write', description: 'Create and edit products' },
    { code: 'orders:read', description: 'View orders' },
    { code: 'orders:process', description: 'Process and fulfill orders' },
    { code: 'orders:dispatch', description: 'Dispatch orders' },
    { code: 'payments:read', description: 'View payments' },
    { code: 'payments:record', description: 'Record payments' },
    { code: 'tiers:read', description: 'View pricing tiers' },
    { code: 'tiers:manage', description: 'Manage pricing tiers' },
    { code: 'customers:read', description: 'View customers' },
    { code: 'customers:manage', description: 'Manage customers' },
    { code: 'stock:read', description: 'View stock levels' },
    { code: 'stock:manage', description: 'Manage stock levels' },
    { code: 'reports:read', description: 'View reports' },
    { code: 'users:read', description: 'View admin users' },
    { code: 'users:manage', description: 'Manage admin users' },
    { code: 'sales:read', description: 'View sales data' },
    { code: 'sales:manage', description: 'Manage sales data' },
    { code: 'settings:read', description: 'View system settings' },
    { code: 'settings:manage', description: 'Manage system settings' },
  ];
  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: p,
    });
  }
  console.log('✅ Permissions seeded (20 permissions).');

  const roles = ['MASTER_ADMIN', 'SALES_ADMIN', 'ACCOUNTS_ADMIN', 'WAREHOUSE_ADMIN'];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r, description: `${r} System Role` },
    });
  }

  // 5. Seed Users & Customer Company
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@starfashion.com' },
    update: { role: 'MASTER_ADMIN', approvalStatus: 'APPROVED' },
    create: {
      email: 'admin@starfashion.com',
      passwordHash,
      firstName: 'Master',
      lastName: 'Admin',
      phone: '+491512345678',
      userType: 'ADMIN',
      role: 'MASTER_ADMIN',
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
    },
  });

  const customerCompany = await prisma.customerCompany.upsert({
    where: { id: 'company-fashion-retail' },
    update: { onboardingStatus: 'APPROVED' },
    create: {
      id: 'company-fashion-retail',
      companyName: 'Fashion Retail House GmbH',
      taxId: 'DE999888777',
      registrationNumber: 'HRB-123456',
      creditLimit: 50000.0,
      paymentTermsId: net30.id,
      status: 'ACTIVE',
      onboardingStatus: 'APPROVED',
      notes: 'Premier wholesale retail partner in Germany',
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'buyer@fashionretail.com' },
    update: { approvalStatus: 'APPROVED' },
    create: {
      email: 'buyer@fashionretail.com',
      passwordHash,
      firstName: 'Anna',
      lastName: 'Schmidt',
      phone: '+491709876543',
      userType: 'CUSTOMER',
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
    },
  });

  await prisma.customerUser.upsert({
    where: {
      customerId_userId: {
        customerId: customerCompany.id,
        userId: customerUser.id,
      },
    },
    update: {},
    create: {
      customerId: customerCompany.id,
      userId: customerUser.id,
      role: 'OWNER',
    },
  });

  // Ensure customer has a cart
  await prisma.cart.upsert({
    where: { customerId: customerCompany.id },
    update: {},
    create: { customerId: customerCompany.id },
  });

  console.log('✅ Users & Wholesale Customer Company seeded.');

  // 6. Seed Catalogue: Categories, Collections, Colors, Sizes
  const catWomen = await prisma.category.upsert({
    where: { slug: 'womens-wear' },
    update: {},
    create: { name: "Women's Wear", slug: 'womens-wear', sortOrder: 1 },
  });

  const catMen = await prisma.category.upsert({
    where: { slug: 'mens-wear' },
    update: {},
    create: { name: "Men's Wear", slug: 'mens-wear', sortOrder: 2 },
  });

  const springCollection = await prisma.collection.upsert({
    where: { id: 'col-ss2026' },
    update: {},
    create: { id: 'col-ss2026', name: 'Spring/Summer 2026', season: 'SS2026', year: 2026 },
  });

  const colors = [
    { id: 'c-black', name: 'Black', hexCode: '#000000' },
    { id: 'c-white', name: 'White', hexCode: '#FFFFFF' },
    { id: 'c-navy', name: 'Navy Blue', hexCode: '#000080' },
    { id: 'c-emerald', name: 'Emerald Green', hexCode: '#008000' },
  ];
  for (const c of colors) {
    await prisma.color.upsert({ where: { id: c.id }, update: c, create: c });
  }

  const sizes = [
    { id: 's-s', name: 'S', sortOrder: 1 },
    { id: 's-m', name: 'M', sortOrder: 2 },
    { id: 's-l', name: 'L', sortOrder: 3 },
    { id: 's-xl', name: 'XL', sortOrder: 4 },
  ];
  for (const s of sizes) {
    await prisma.size.upsert({ where: { id: s.id }, update: s, create: s });
  }

  // 7. Seed Warehouse Location & Sample Products
  const warehouse = await prisma.inventoryLocation.upsert({
    where: { code: 'WH-CENTRAL' },
    update: {},
    create: { id: 'wh-central', name: 'Central Warehouse', code: 'WH-CENTRAL', address: 'Fashion Logistikpark 1, Hamburg' },
  });

  const productsData = [
    {
      articleNumber: 'ART-1001',
      name: 'Silk Blend Tailored Blazer',
      slug: 'silk-blend-tailored-blazer',
      description: 'Premium tailored blazer made from lightweight silk blend.',
      categoryId: catWomen.id,
      collectionId: springCollection.id,
      basePrice: 120.0, // Base wholesale price
    },
    {
      articleNumber: 'ART-1002',
      name: 'Classic Cotton Oxford Shirt',
      slug: 'classic-cotton-oxford-shirt',
      description: 'Breathable 100% organic cotton oxford shirt.',
      categoryId: catMen.id,
      collectionId: springCollection.id,
      basePrice: 45.0,
    },
    {
      articleNumber: 'ART-1003',
      name: 'Merino Wool Crewneck Sweater',
      slug: 'merino-wool-crewneck-sweater',
      description: 'Ultra-soft fine gauge Italian merino wool sweater.',
      categoryId: catWomen.id,
      collectionId: springCollection.id,
      basePrice: 85.0,
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { articleNumber: p.articleNumber },
      update: p,
      create: p,
    });

    // Create variants for Black and White in S, M, L
    for (const color of colors.slice(0, 2)) {
      for (const size of sizes.slice(0, 3)) {
        const sku = `${p.articleNumber}-${color.id.replace('c-', '').toUpperCase()}-${size.name}`;
        const variant = await prisma.productVariant.upsert({
          where: { sku },
          update: {},
          create: {
            productId: product.id,
            colorId: color.id,
            sizeId: size.id,
            sku,
          },
        });

        await prisma.inventory.upsert({
          where: {
            variantId_locationId: {
              variantId: variant.id,
              locationId: warehouse.id,
            },
          },
          update: { onHand: 500 },
          create: {
            variantId: variant.id,
            locationId: warehouse.id,
            onHand: 500,
            reserved: 0,
            reorderLevel: 50,
          },
        });
      }
    }
  }

  console.log('✅ Catalogue products, SKUs, and stock inventory seeded.');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
