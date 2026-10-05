function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function buildStockMovementData({
  product,
  type,
  quantity,
  previousQuantity,
  newQuantity,
  reason,
  location,
  reference,
  user,
  createdAt,
}) {
  return {
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    type,
    quantity,
    previousQuantity,
    newQuantity,
    reason,
    location,
    reference,
    user,
    ...(createdAt ? { createdAt } : {}),
  };
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
          price: row.price ?? row.mrp ?? 0,
          minStock: row.minStock,
          monthlyInterest: row.monthlyInterest ?? 0,
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
          price: row.price ?? row.mrp ?? 0,
          minStock: row.minStock,
          monthlyInterest: row.monthlyInterest ?? 0,
          status,
          description: row.description,
          image: row.image,
          previousQuantity: row.quantity,
          paidAmount: 0,
        },
      });

      if (client.stockMovement?.create) {
        if (existingProduct && existingProduct.quantity !== row.quantity) {
          await client.stockMovement.create({
            data: buildStockMovementData({
              product: {
                id: product.id,
                name: row.name,
                sku: row.sku,
              },
              type: "adjustment",
              quantity: row.quantity - existingProduct.quantity,
              previousQuantity: existingProduct.quantity,
              newQuantity: row.quantity,
              reason: "Excel upload",
              createdAt: now,
            }),
          });
        }

        if (!existingProduct && row.quantity > 0) {
          await client.stockMovement.create({
            data: buildStockMovementData({
              product: {
                id: product.id,
                name: row.name,
                sku: row.sku,
              },
              type: "in",
              quantity: row.quantity,
              previousQuantity: 0,
              newQuantity: row.quantity,
              reason: "Initial stock (Excel upload)",
              createdAt: now,
            }),
          });
        }
      }

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

export { bulkImportProducts, buildStockMovementData, startOfUtcDay };
