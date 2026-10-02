import dotenv from "dotenv";
dotenv.config();

import pkg from "@prisma/client";

const { PrismaClient } = pkg;

function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

async function main() {
  const prisma = new PrismaClient();
  const startedAt = new Date();
  const snapshotDate = startOfUtcDay(startedAt);

  const summary = {
    snapshotDate: snapshotDate.toISOString(),
    startedAt: startedAt.toISOString(),
    processed: 0,
    created: 0,
    updated: 0,
    failed: 0,
    failures: [],
  };

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        quantity: true,
      },
      orderBy: { id: "asc" },
    });

    for (const product of products) {
      summary.processed += 1;

      try {
        const existing = await prisma.productStockSnapshot.findUnique({
          where: {
            productId_snapshotDate: {
              productId: product.id,
              snapshotDate,
            },
          },
          select: {
            id: true,
            quantity: true,
          },
        });

        if (!existing) {
          await prisma.productStockSnapshot.create({
            data: {
              productId: product.id,
              snapshotDate,
              quantity: product.quantity,
            },
          });
          summary.created += 1;
        } else if (existing.quantity !== product.quantity) {
          await prisma.productStockSnapshot.update({
            where: {
              productId_snapshotDate: {
                productId: product.id,
                snapshotDate,
              },
            },
            data: {
              quantity: product.quantity,
            },
          });
          summary.updated += 1;
        }
      } catch (error) {
        summary.failed += 1;
        summary.failures.push({
          productId: product.id,
          sku: product.sku,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(JSON.stringify({
      ...summary,
      finishedAt: new Date().toISOString(),
    }, null, 2));

    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    snapshotDate: startOfUtcDay(new Date()).toISOString(),
    startedAt: new Date().toISOString(),
    fatal: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
