import dotenv from "dotenv";
dotenv.config();
import { execSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createAuthService } from "./services/auth.js";
import { createInventoryService } from "./services/inventory.js";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

dotenv.config();

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const prismaClientDirectory = path.resolve(currentDirectory, "../node_modules/.prisma/client");

function cleanupStalePrismaArtifacts() {
  try {
    for (const fileName of readdirSync(prismaClientDirectory)) {
      if (/^query_engine-windows\.dll\.node\.tmp/i.test(fileName)) {
        rmSync(path.join(prismaClientDirectory, fileName), { force: true });
      }
    }
  } catch (error) {
    console.warn("Prisma artifact cleanup skipped:", error);
  }
}

// Clean stale Prisma temp artifacts and apply migrations on start.
try {
  console.log("Cleaning stale Prisma artifacts...");
  cleanupStalePrismaArtifacts();
  console.log("Generating Prisma client...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("Applying database migrations...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} catch (error) {
  console.error("Startup preparation failed:", error);
  process.exit(1);
}

const prisma = new PrismaClient();
const auth = createAuthService(prisma);
const inventory = createInventoryService(prisma);
const app = createApp({
  health: async () => ({
    status: "ok",
    database: await prisma.$queryRaw`SELECT 'connected' as ok`
  }),
  auth,
  inventory,
});

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
