import dotenv from "dotenv";
dotenv.config();
import { execSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createAuthService } from "./services/auth.js";
import { createInventoryService } from "./services/inventory.js";
import { createOutstandingService } from "./services/outstanding.js";
import { createOutstandingLinkService } from "./services/outstanding-links.js";
import { createNotificationProvider } from "./services/notification-providers.js";
import { createOutstandingNotifier } from "./services/outstanding-notifier.js";
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

function getNextIndiaRunTime(timeString, current = new Date()) {
  const [hourText = "09", minuteText = "00"] = String(timeString ?? "09:00").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const currentInIndia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(current);
  const year = Number(currentInIndia.find((part) => part.type === "year")?.value);
  const month = Number(currentInIndia.find((part) => part.type === "month")?.value);
  const day = Number(currentInIndia.find((part) => part.type === "day")?.value);
  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute - 330, 0, 0));
  if (candidate > current) {
    return candidate;
  }
  return new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
}

function startOutstandingNotificationScheduler(notifier, timeString) {
  let timer = null;

  const scheduleNext = () => {
    const nextRun = getNextIndiaRunTime(timeString);
    const delay = Math.max(1000, nextRun.getTime() - Date.now());
    timer = setTimeout(async () => {
      try {
        await notifier.runDueToday();
      } catch (error) {
        console.error("Outstanding notification scheduler failed", error);
      }
      scheduleNext();
    }, delay);
  };

  scheduleNext();
  return () => {
    if (timer) {
      clearTimeout(timer);
    }
  };
}

const prisma = new PrismaClient();
const auth = createAuthService(prisma);
const inventory = createInventoryService(prisma);
const outstanding = createOutstandingService(prisma);
const outstandingLinks = createOutstandingLinkService(prisma, {
  publicAppUrl: process.env.PUBLIC_APP_URL,
});
const notificationProvider = createNotificationProvider();
const outstandingNotifier = createOutstandingNotifier({
  prisma,
  provider: notificationProvider,
  linkService: outstandingLinks,
});
const app = createApp({
  health: async () => ({
    status: "ok",
    database: await prisma.$queryRaw`SELECT 'connected' as ok`
  }),
  auth,
  inventory,
  outstanding,
  outstandingLinks,
  outstandingNotifier,
});

const port = Number(process.env.PORT ?? 4000);

if (process.env.NODE_ENV !== "test") {
  startOutstandingNotificationScheduler(outstandingNotifier, process.env.NOTIFY_TIME ?? "09:00");
}

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
