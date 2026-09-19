import { createApp } from "./app.ts";
import { config, ensureDataDirs } from "./config.ts";
import { prisma } from "./db.ts";
import { recoverStuckJobs } from "./services/generation.ts";

ensureDataDirs();

const app = createApp();

app.listen(config.port, "0.0.0.0", () => {
  console.log(`BookPilot API on http://localhost:${config.port}`);
  recoverStuckJobs().catch((err) => console.error("recoverStuckJobs", err));
});

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
