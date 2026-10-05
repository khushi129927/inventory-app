import dotenv from "dotenv";
dotenv.config();

import pkg from "@prisma/client";
import { createOutstandingLinkService } from "../services/outstanding-links.js";
import { createNotificationProvider } from "../services/notification-providers.js";
import { createOutstandingNotifier } from "../services/outstanding-notifier.js";

const { PrismaClient } = pkg;

async function main() {
  const prisma = new PrismaClient();
  const startedAt = new Date();

  try {
    const provider = createNotificationProvider();
    const linkService = createOutstandingLinkService(prisma, {
      publicAppUrl: process.env.PUBLIC_APP_URL,
    });
    const notifier = createOutstandingNotifier({
      prisma,
      provider,
      linkService,
    });

    await notifier.runDueToday();

    console.log(JSON.stringify({
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      provider: provider.mode,
      status: "ok",
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    startedAt: new Date().toISOString(),
    fatal: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
