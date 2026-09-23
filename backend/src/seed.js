import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  const SEED_DEMO_DATA = process.env.SEED_DEMO_DATA === 'true';

  console.log('Seeding database...');

  // 1. Create Admin User
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: {
      name: 'Administrator',
      username: ADMIN_USERNAME,
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log(`Admin user created: ${ADMIN_USERNAME}`);

  if (!SEED_DEMO_DATA) {
    console.log('Demo data seeding skipped. (SEED_DEMO_DATA=false)');
    return;
  }

  console.log('Seeding demo data...');

  // 2. Categories
  const categories = [
    { name: 'Electronics', description: 'Computers, phones, and accessories', color: '#3b82f6' },
    { name: 'Office Supplies', description: 'Paper, pens, and organizational tools', color: '#10b981' },
    { name: 'Furniture', description: 'Desks, chairs, and storage', color: '#f59e0b' },
    { name: 'Networking', description: 'Routers, switches, and cables', color: '#8b5cf6' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // 3. Branches
  const branches = ['Downtown', 'Airport', 'Warehouse'];
  const branchModels = {};
  for (const bName of branches) {
    const branch = await prisma.branch.upsert({
      where: { name: bName },
      update: {},
      create: { name: bName },
    });
    branchModels[bName] = branch;
  }

  // 4. Products (Subset for demo)
  const products = [
    {
      name: 'Wireless Mouse MX',
      sku: 'WMX-2024',
      categoryId: (await prisma.category.findUnique({ where: { name: 'Electronics' } })).id,
      quantity: 120,
      price: 49.99,
      status: 'in_stock',
      minStock: 20,
      monthlyInterest: 5,
      previousQuantity: 120,
      paidAmount: 20,
      branches: {
        create: [
          { branchId: branchModels['Downtown'].id },
          { branchId: branchModels['Airport'].id },
        ],
      },
    },
    {
      name: 'UltraView Monitor 27"',
      sku: 'UVM-27-4K',
      categoryId: (await prisma.category.findUnique({ where: { name: 'Electronics' } })).id,
      quantity: 8,
      price: 349.99,
      status: 'low_stock',
      minStock: 10,
      monthlyInterest: 15,
      previousQuantity: 8,
      paidAmount: 100,
      branches: {
        create: [{ branchId: branchModels['Downtown'].id }],
      },
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
  }

  console.log('Demo data seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
