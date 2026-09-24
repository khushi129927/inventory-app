function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

async function bulkImportProducts(client, rows, options = {}) {
  const results = { created: 0, updated: 0, errors: [] };
  const now = options.now?.() ?? new Date();
  const snapshotDate = startOfUtcDay(now);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // 1. Handle Category
      let category = await client.category.findUnique({
        where: { name: row.category },
      });

      if (!category) {
        category = await client.category.create({
          data: {
            name: row.category,
            description: "",
            color: "#3b82f6",
          },
        });
      }

      // 2. Determine Status
      let status = "in_stock";
      if (row.quantity === 0) status = "out_of_stock";
      else if (row.quantity <= row.minStock) status = "low_stock";

      const existingProduct = await client.product.findUnique({
        where: { sku: row.sku },
      });

      // 3. Upsert Product
      const product = await client.product.upsert({
        where: { sku: row.sku },
        update: {
          name: row.name,
          categoryId: category.id,
          quantity: row.quantity,
          previousQuantity: existingProduct?.quantity ?? row.quantity,
          mrp: row.mrp ?? row.price,
          minStock: row.minStock,
          monthlyInterest: row.monthlyInterest,
          status,
          description: row.description,
          image: row.image,
        },
        create: {
          name: row.name,
          sku: row.sku,
          categoryId: category.id,
          quantity: row.quantity,
          mrp: row.mrp ?? row.price,
          minStock: row.minStock,
          monthlyInterest: row.monthlyInterest,
          status,
          description: row.description,
          image: row.image,
          previousQuantity: row.quantity,
          paidAmount: 0,
        },
      });

      if (client.productStockSnapshot?.upsert) {
        await client.productStockSnapshot.upsert({
          where: {
            productId_snapshotDate: {
              productId: product.id,
              snapshotDate,
            },
          },
          update: {
            quantity: row.quantity,
          },
          create: {
            productId: product.id,
            snapshotDate,
            quantity: row.quantity,
          },
        });
      }

      // 4. Handle Branches
      if (row.availableBranches && row.availableBranches.length > 0) {
        // Simplified: assuming branches are already created or handled separately.
      }

      if (existingProduct) {
        results.updated++;
      } else {
        results.created++;
      }
    } catch (e) {
      results.errors.push({ row: i + 1, error: e.message });
    }
  }

  return results;
}

export { bulkImportProducts, startOfUtcDay };
