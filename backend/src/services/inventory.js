import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { bulkImportProducts } from "./bulk-import.js";

function hasPrismaModels(client) {
  return Boolean(client?.product?.findMany);
}

function normalizeStatus(status) {
  return typeof status === "string" ? status.replaceAll("_", "-") : status;
}

function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function getYesterdaySnapshotInfo(product, now) {
  const current = now ?? new Date();
  const yesterdayStart = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - 1));
  const yesterdayEnd = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()));
  const matchingSnapshot = Array.isArray(product.stockSnapshots)
    ? product.stockSnapshots.find((snapshot) => {
        const snapshotDate = new Date(snapshot.snapshotDate);
        return snapshotDate >= yesterdayStart && snapshotDate < yesterdayEnd;
      })
    : undefined;

  return {
    yesterdayQuantity: matchingSnapshot?.quantity ?? 0,
    hasYesterdaySnapshot: Boolean(matchingSnapshot),
    yesterdaySnapshotDate: matchingSnapshot ? new Date(matchingSnapshot.snapshotDate).toISOString() : null,
  };
}

function mapProduct(product, now) {
  const normalizedProduct = { ...product };

  if (product.categoryName === undefined && product.category?.name !== undefined) {
    normalizedProduct.categoryName = product.category.name;
  }

  const normalizedStatus = normalizeStatus(product.status);
  if (normalizedStatus !== undefined) {
    normalizedProduct.status = normalizedStatus;
  }

  Object.assign(normalizedProduct, getYesterdaySnapshotInfo(product, now));

  if (Array.isArray(product.availableBranches)) {
    return normalizedProduct;
  }

  if (Array.isArray(product.branches)) {
    const branchNames = product.branches.map((branchRecord) =>
      typeof branchRecord === "string"
        ? branchRecord
        : branchRecord?.branch?.name ?? branchRecord?.name
    );

    normalizedProduct.branches = branchNames;
    normalizedProduct.availableBranches = branchNames;
  }

  return normalizedProduct;
}

function normalizeProductUpdateData(data) {
  const normalizedStatus =
    typeof data.status === "string" ? data.status.replaceAll("-", "_") : data.status;
  const normalized = { ...data };
  if (typeof normalizedStatus === "string" && normalizedStatus.length > 0) {
    normalized.status = normalizedStatus;
  }
  for (const key of ["quantity", "price", "mrp", "monthlyInterest", "minStock", "previousQuantity", "paidAmount", "shipping", "installation"]) {
    if (typeof normalized[key] === "string" && normalized[key].trim() !== "") {
      const value = Number(normalized[key]);
      if (!Number.isNaN(value)) {
        normalized[key] = value;
      }
    }
  }
  if (typeof normalized.monthsInInventory === "number") {
    delete normalized.monthsInInventory;
  }
  return normalized;
}

export function createInventoryService(prisma, options = {}) {
  const now = options.now ?? (() => new Date());

  return {
    async listProducts(filters = {}) {
      const { categoryId, search } = filters;

      if (!hasPrismaModels(prisma)) {
        const result = await prisma.query("select * from products");
        return result.rows.map((product) => mapProduct(product, now()));
      }

      const where = {};
      if (categoryId) where.categoryId = categoryId;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          branches: { include: { branch: true } },
          stockSnapshots: {
            where: {
              snapshotDate: {
                gte: new Date(Date.UTC(now().getUTCFullYear(), now().getUTCMonth(), now().getUTCDate() - 1)),
                lt: new Date(Date.UTC(now().getUTCFullYear(), now().getUTCMonth(), now().getUTCDate())),
              },
            },
            orderBy: { snapshotDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return products.map((product) => mapProduct(product, now()));
    },

    async listCategories() {
      if (!hasPrismaModels(prisma)) {
        const result = await prisma.query("select * from categories");
        return result.rows;
      }

      return prisma.category.findMany({
        orderBy: { name: 'asc' },
      });
    },

    async listBranches() {
      if (!hasPrismaModels(prisma)) {
        const result = await prisma.query("select * from branches");
        return result.rows;
      }

      return prisma.branch.findMany({
        orderBy: { name: 'asc' },
      });
    },

    async listUsers() {
      if (!prisma?.user?.findMany) {
        const result = await prisma.query('select id, name, username, role from users order by username asc');
        return result.rows;
      }

      return prisma.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
        orderBy: { username: 'asc' },
      });
    },

    async createUser(data) {
      const normalizedUsername = data.username.trim();
      const hashedPassword = await bcrypt.hash(data.password, 10);

      if (!prisma?.user?.create) {
        const existingUser = await prisma.query('select id from users where lower(username) = lower($1) limit 1', [normalizedUsername]);
        if (existingUser.rows.length > 0) {
          throw new Error("Username already exists");
        }

        const id = data.id ?? `user-${crypto.randomUUID()}`;
        const result = await prisma.query(
          'insert into users (id, name, username, password, role) values ($1, $2, $3, $4, $5) returning id, name, username, role',
          [id, data.name, normalizedUsername, hashedPassword, data.role]
        );
        return result.rows[0];
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          username: {
            equals: normalizedUsername,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error("Username already exists");
      }

      return prisma.user.create({
        data: {
          name: data.name,
          username: normalizedUsername,
          password: hashedPassword,
          role: data.role,
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      });
    },

    async updateUser(id, data) {
      const normalizedUsername = data.username?.trim();

      if (!prisma?.user?.update) {
        if (normalizedUsername) {
          const existingUser = await prisma.query(
            'select id from users where lower(username) = lower($1) and id <> $2 limit 1',
            [normalizedUsername, id]
          );

          if (existingUser.rows.length > 0) {
            throw new Error("Username already exists");
          }
        }

        const assignments = [];
        const values = [];

        if (typeof data.name === "string") {
          values.push(data.name);
          assignments.push(`name = $${values.length}`);
        }

        if (typeof normalizedUsername === "string") {
          values.push(normalizedUsername);
          assignments.push(`username = $${values.length}`);
        }

        if (typeof data.password === "string" && data.password.trim()) {
          const hashedPassword = await bcrypt.hash(data.password, 10);
          values.push(hashedPassword);
          assignments.push(`password = $${values.length}`);
        }

        if (typeof data.role === "string") {
          values.push(data.role);
          assignments.push(`role = $${values.length}`);
        }

        values.push(id);
        const result = await prisma.query(
          `update users set ${assignments.join(", ")}, updated_at = now() where id = $${values.length} returning id, name, username, role`,
          values
        );

        return result.rows[0];
      }

      if (normalizedUsername) {
        const existingUser = await prisma.user.findFirst({
          where: {
            id: { not: id },
            username: {
              equals: normalizedUsername,
              mode: 'insensitive',
            },
          },
          select: { id: true },
        });

        if (existingUser) {
          throw new Error("Username already exists");
        }
      }

      const updateData = {
        ...(typeof data.name === "string" ? { name: data.name } : {}),
        ...(typeof normalizedUsername === "string" ? { username: normalizedUsername } : {}),
        ...(typeof data.role === "string" ? { role: data.role } : {}),
        ...(typeof data.password === "string" && data.password.trim()
          ? { password: await bcrypt.hash(data.password, 10) }
          : {}),
      };

      return prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
      });
    },

    async deleteUser(id) {
      if (!prisma?.user?.delete) {
        const existingUser = await prisma.query('select role from users where id = $1 limit 1', [id]);
        const targetUser = existingUser.rows[0];

        if (targetUser?.role === "admin") {
          throw new Error("Admin users cannot be deleted");
        }

        await prisma.query('delete from users where id = $1', [id]);
        return;
      }

      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });

      if (targetUser?.role === "admin") {
        throw new Error("Admin users cannot be deleted");
      }

      await prisma.user.delete({
        where: { id },
      });
    },

    async listOrderRequests() {
      if (!prisma?.orderRequest?.findMany) {
        const result = await prisma.query('select * from "OrderRequest" order by "createdAt" desc');
        return result.rows;
      }

      return prisma.orderRequest.findMany({
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    async createProduct(data) {
      return prisma.product.create({ data });
    },

    async updateProduct(id, data) {
      const normalized = normalizeProductUpdateData(data);
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] inventory.updateProduct received`, {
        productId: id,
        sku: normalized.sku,
        data: normalized,
      });

      try {
        const product = await prisma.product.update({
          where: { id },
          data: normalized,
        });

        console.log(`[${new Date().toISOString()}] inventory.updateProduct prisma result`, product);

        if (prisma.productStockSnapshot?.upsert && typeof normalized.quantity === "number") {
          const snapshotDate = startOfUtcDay(new Date());
          await prisma.productStockSnapshot.upsert({
            where: {
              productId_snapshotDate: {
                productId: id,
                snapshotDate,
              },
            },
            update: { quantity: normalized.quantity },
            create: {
              productId: id,
              snapshotDate,
              quantity: normalized.quantity,
            },
          });
        }

        return product;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] inventory.updateProduct failed`, error);
        throw error;
      }
    },

    async deleteProduct(id) {
      return prisma.product.delete({
        where: { id },
      });
    },

    async recordMovement({ productId, type, quantity, reason, location, reference, userId }) {
      return prisma.$transaction(async (tx) => {
        // 1. Lock product row to prevent race conditions
        const product = await tx.$queryRaw`SELECT * FROM "Product" WHERE id = ${productId} FOR UPDATE`;
        if (!product || product.length === 0) throw new Error("Product not found");
        const p = product[0];

        const previousQuantity = p.quantity;
        let newQuantity = previousQuantity;

        if (type === 'in') {
          newQuantity += quantity;
        } else if (type === 'out') {
          newQuantity -= quantity;
        } else if (type === 'adjustment') {
          newQuantity += quantity; // quantity can be negative
        } else if (type === 'transfer') {
          // Transfers are usually handled as out from one and in to another,
          // but the frontend treats it as a record.
          // We'll keep quantity unchanged for pure transfers unless specified.
        }

        if (newQuantity < 0) {
          throw new Error("Insufficient stock: movement would result in negative quantity");
        }

        // Determine status based on minStock
        let status = 'in_stock';
        if (newQuantity === 0) status = 'out_of_stock';
        else if (newQuantity <= p.minStock) status = 'low_stock';

        // 2. Update Product
        await tx.product.update({
          where: { id: productId },
          data: {
            quantity: newQuantity,
            previousQuantity,
            status,
            updatedAt: new Date(),
          },
        });

        // 3. Create Movement Record
        const movement = await tx.stockMovement.create({
          data: {
            productId,
            productName: p.name,
            productSku: p.sku,
            type,
            quantity,
            previousQuantity,
            newQuantity,
            reason,
            location,
            reference,
            user: userId,
          },
        });

        // 4. Create Activity Log
        await tx.activityItem.create({
          data: {
            type: type === 'in' ? 'stock_in' : type === 'out' ? 'stock_out' : 'stock_adjusted',
            message: `${type === 'in' ? 'Received' : type === 'out' ? 'Shipped' : 'Adjusted'} ${quantity} units of ${p.name}`,
            productId,
            productName: p.name,
          },
        });

        return movement;
      });
    },

    async importProducts(rows) {
      if (!hasPrismaModels(prisma)) {
        throw new Error("Bulk import requires Prisma-backed inventory storage");
      }

      return bulkImportProducts(prisma, rows, { now });
    },

    async createOrderRequest(data) {
      const requestedProductIds = [...new Set(data.items.map((item) => item.productId))];

      if (prisma.product?.findMany) {
        const existingProducts = await prisma.product.findMany({
          where: {
            id: {
              in: requestedProductIds,
            },
          },
          select: { id: true },
        });

        const existingProductIds = new Set(existingProducts.map((product) => product.id));
        const hasMissingProduct = requestedProductIds.some((productId) => !existingProductIds.has(productId));

        if (hasMissingProduct) {
          throw new Error("One or more selected products are no longer available. Refresh the builder and try again.");
        }
      }

      return prisma.orderRequest.create({
        data: {
          ...data,
          status: "pending",
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    },

    async updateOrderRequest(id, status) {
      return prisma.orderRequest.update({
        where: { id },
        data: { status },
      });
    },
  };
}
