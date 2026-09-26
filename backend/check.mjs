import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const cols = await prisma.$queryRawUnsafe(
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'User';"
);
console.log('User columns:', cols);

const userCount = await prisma.$queryRawUnsafe('SELECT count(*) FROM "User";');
console.log('User count:', userCount);

const productCount = await prisma.$queryRawUnsafe('SELECT count(*) FROM "Product";');
console.log('Product count:', productCount);

await prisma.$disconnect();