import path from "node:path";
import express from "express";
import cors from "cors";
import { config } from "./config.ts";
import { llmEnabled } from "./llm/index.ts";
import { requireAuth } from "./middleware/auth.ts";
import { errorHandler } from "./middleware/error.ts";
import { authRouter } from "./routes/auth.ts";
import { homeRouter } from "./routes/home.ts";
import { studySetsRouter } from "./routes/studySets.ts";
import { documentsRouter } from "./routes/documents.ts";
import { readerRouter } from "./routes/reader.ts";
import { notesRouter } from "./routes/notes.ts";
import { quizRouter } from "./routes/quiz.ts";
import { gamesFinishRouter, minigamesRouter } from "./routes/minigames.ts";
import { progressRouter } from "./routes/progress.ts";

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, llm: llmEnabled() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/home", requireAuth, homeRouter);
  app.use("/api/study-sets/:id/quiz", requireAuth, quizRouter);
  app.use("/api/study-sets/:id/minigames", requireAuth, minigamesRouter);
  app.use("/api/study-sets/:id/games", requireAuth, gamesFinishRouter);
  app.use("/api/study-sets/:id/progress", requireAuth, progressRouter);
  app.use("/api/study-sets", requireAuth, studySetsRouter);
  app.use("/api/documents", requireAuth, documentsRouter);
  app.use("/api/reader", requireAuth, readerRouter);
  app.use("/api/notes", requireAuth, notesRouter);

  if (config.isProd) {
    const dist = path.join(process.cwd(), "client", "dist");
    app.use(express.static(dist));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
