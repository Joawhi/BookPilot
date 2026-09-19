import { createApp } from "./app.ts";
import { config, ensureDataDirs } from "./config.ts";
import { prisma } from "./db.ts";
import { ensureLocalDevUser } from "./devUser.ts";
import { llmEnabled } from "./llm/index.ts";
import { recoverStuckJobs } from "./services/generation.ts";

ensureDataDirs();

const app = createApp();

app.listen(config.port, "0.0.0.0", () => {
  console.log(`BookPilot API on http://localhost:${config.port}`);
  console.log(
    llmEnabled()
      ? `LLM: on (${config.openaiModel} via ${config.openaiBaseUrl.includes("googleapis") ? "Gemini" : "OpenAI-compat"})`
      : "LLM: off (extractive fallback — set OPENAI_API_KEY in .env)",
  );
  ensureLocalDevUser().catch((err) => console.error("ensureLocalDevUser", err));
  recoverStuckJobs().catch((err) => console.error("recoverStuckJobs", err));
});

async function shutdown() {
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
