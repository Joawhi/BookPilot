import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

const onReplit = Boolean(process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DEPLOYMENT);
// Local: .env wins. Replit: Secrets already in process.env must not be overwritten by a missing/empty .env.
dotenv.config({ override: !onReplit });

const root = process.cwd();
const openaiKey = process.env.OPENAI_API_KEY ?? "";
const groqKey = openaiKey.startsWith("gsk_");

export const config = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  databaseUrl: process.env.DATABASE_URL ?? `file:${path.join(root, "data", "bookpilot.db")}`,
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR ?? "data/uploads"),
  isProd: process.env.NODE_ENV === "production",
  openaiKey,
  openaiBaseUrl: (process.env.OPENAI_BASE_URL ?? (groqKey ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1")).replace(/\/$/, ""),
  openaiModel: process.env.OPENAI_MODEL ?? (groqKey ? "openai/gpt-oss-20b" : "gpt-4o-mini"),
  contactEmail: process.env.CONTACT_EMAIL ?? "bookpilot@localhost",
};

export function ensureDataDirs() {
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
