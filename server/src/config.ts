import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config({ override: true }); // reload .env on process restart

const root = process.cwd();

export const config = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  databaseUrl: process.env.DATABASE_URL ?? `file:${path.join(root, "data", "bookpilot.db")}`,
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR ?? "data/uploads"),
  isProd: process.env.NODE_ENV === "production",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  contactEmail: process.env.CONTACT_EMAIL ?? "bookpilot@localhost",
};

export function ensureDataDirs() {
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
