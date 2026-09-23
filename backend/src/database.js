import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { seedData } from "./data/seed.js";

export function createDatabase(connectionString) {
  const pool = new Pool({ connectionString });

  return {
    pool,
    async health() {
      const result = await pool.query("select 1 as ok");
      return result.rows[0]?.ok === 1 ? "connected" : "unknown";
    },
    async query(text, params) {
      return pool.query(text, params);
    },
    async close() {
      await pool.end();
    },
    async ensureSchema() {
      await pool.query(`
        create table if not exists users (
          id text primary key,
          name text not null,
          username text not null unique,
          password text not null,
          role text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists branches (
          id text primary key,
          name text not null unique,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists categories (
          id text primary key,
          name text not null unique,
          description text not null default '',
          product_count integer not null default 0,
          color text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists products (
          id text primary key,
          name text not null,
          sku text not null unique,
          serial_number text,
          model_number text,
          category_id text not null references categories(id) on delete restrict,
          quantity integer not null,
          price double precision not null,
          status text not null,
          image text,
          description text,
          min_stock integer not null,
          monthly_interest double precision not null,
          previous_quantity integer not null,
          shipping double precision,
          installation double precision,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists product_branches (
          product_id text not null references products(id) on delete cascade,
          branch_id text not null references branches(id) on delete cascade,
          primary key (product_id, branch_id)
        );

        create table if not exists order_requests (
          id text primary key,
          customer_name text not null,
          customer_email text not null,
          status text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists order_request_items (
          id text primary key,
          order_request_id text not null references order_requests(id) on delete cascade,
          product_id text not null references products(id) on delete restrict,
          product_name text not null,
          quantity integer not null
        );
      `);
    },
    async seed() {
      await this.ensureSchema();

      for (const user of seedData.users) {
        const existing = await pool.query("select id from users where username = $1", [user.username]);
        if (existing.rowCount === 0) {
          await pool.query(
            "insert into users (id, name, username, password, role) values ($1, $2, $3, $4, $5)",
            [user.id, user.name, user.username, user.password, user.role]
          );
        }
      }

      for (const branch of seedData.branches) {
        await pool.query(
          "insert into branches (id, name) values ($1, $2) on conflict (id) do nothing",
          [branch.id, branch.name]
        );
      }

      for (const category of seedData.categories) {
        await pool.query(
          `insert into categories (id, name, description, product_count, color)
           values ($1, $2, $3, $4, $5)
           on conflict (id) do update set name = excluded.name, description = excluded.description, product_count = excluded.product_count, color = excluded.color, updated_at = now()`,
          [category.id, category.name, category.description, category.productCount, category.color]
        );
      }

      const products = [
        {
          id: "prod-1",
          name: "Wireless Mouse MX",
          sku: "WMX-2024",
          serialNumber: "WMX-2024",
          modelNumber: "MX-2024",
          categoryId: "cat-electronics",
          quantity: 120,
          price: 49.99,
          status: "in-stock",
          image: null,
          description: "Ergonomic wireless mouse with precision tracking.",
          minStock: 20,
          monthlyInterest: 5,
          previousQuantity: 120,
          shipping: null,
          installation: null,
          branches: ["branch-downtown", "branch-airport"],
        },
      ];

      for (const product of products) {
        await pool.query(
          `insert into products
            (id, name, sku, serial_number, model_number, category_id, quantity, price, status, image, description, min_stock, monthly_interest, previous_quantity, shipping, installation)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           on conflict (id) do update set
             name = excluded.name,
             sku = excluded.sku,
             serial_number = excluded.serial_number,
             model_number = excluded.model_number,
             category_id = excluded.category_id,
             quantity = excluded.quantity,
             price = excluded.price,
             status = excluded.status,
             image = excluded.image,
             description = excluded.description,
             min_stock = excluded.min_stock,
             monthly_interest = excluded.monthly_interest,
             previous_quantity = excluded.previous_quantity,
             shipping = excluded.shipping,
             installation = excluded.installation,
             updated_at = now()`,
          [
            product.id,
            product.name,
            product.sku,
            product.serialNumber,
            product.modelNumber,
            product.categoryId,
            product.quantity,
            product.price,
            product.status,
            product.image,
            product.description,
            product.minStock,
            product.monthlyInterest,
            product.previousQuantity,
            product.shipping,
            product.installation,
          ]
        );

        await pool.query("delete from product_branches where product_id = $1", [product.id]);
        for (const branchId of product.branches) {
          await pool.query(
            "insert into product_branches (product_id, branch_id) values ($1, $2) on conflict do nothing",
            [product.id, branchId]
          );
        }
      }
    },
  };
}

export async function createSeededDatabase(connectionString) {
  const db = createDatabase(connectionString);
  await db.seed();
  return db;
}
