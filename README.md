# BookPilot

A personalized learning companion for people who read dense material.
Upload PDFs, read them without distractions, get plain-language explanations and **real** academic references, then play a quiz and minigames generated from your own texts.

Working name. No camera, no eye tracking. Your PDFs stay private.

## Quick start

```bash
# Node 20+
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

A sample born-digital PDF lives at `docs/fixtures/sample-bayes.pdf` — use it to try the full flow without hunting for a paper.

Create an account (email + password). You can use the app immediately.

### Optional: real LLM explanations / quiz quality

The app runs without a key using an extractive fallback (it pulls sentences from your PDF). For high-quality explanations, quiz items and minigames, add an OpenAI-compatible key to `.env`:

```
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

Any OpenAI-compatible provider works (OpenAI, Groq, Together, a local proxy). **Never put the key in client code.**

Academic references always come from Semantic Scholar, OpenAlex and arXiv — the model only proposes search queries.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + Vite together |
| `npm run dev:server` | Express on `:3001` |
| `npm run dev:client` | Vite on `:5173` |
| `npm run build` | Production client + server |
| `npm start` | Serve the production build (set `NODE_ENV=production`) |
| `npm test` | Unit tests |
| `npx prisma studio` | Inspect the database |

## Replit

1. Import the repo.
2. Set secrets: `JWT_SECRET`, optionally `OPENAI_API_KEY`.
3. Run `npm install && npx prisma db push && npm run dev`.
4. If Replit assigns `PORT`, the server already honors it. The Vite config proxies `/api`.

SQLite is the default because it is the fastest to boot on Replit. To use PostgreSQL later, change `provider` in `prisma/schema.prisma` to `postgresql` and set `DATABASE_URL` to your Postgres URL, then `npx prisma db push`.

## Production notes

- Change `JWT_SECRET`.
- Put `data/` on a persistent disk (it holds `bookpilot.db` and uploaded PDFs).
- Serve the Vite build from Express (`NODE_ENV=production`).
- PDFs are stored at `data/uploads/<userId>/<documentId>.pdf` and are only returned to the owning user.

## Docs for humans and agents

| File | Purpose |
|---|---|
| [AGENTS.md](./AGENTS.md) | How coding agents should navigate this repo |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Layers, request flow, background jobs |
| [docs/DATA-MODEL.md](./docs/DATA-MODEL.md) | Tables and relationships |
| [docs/API.md](./docs/API.md) | HTTP endpoints |
| [docs/LLM-CONTRACTS.md](./docs/LLM-CONTRACTS.md) | Prompts and JSON schemas |
| [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md) | Visual language |
| [docs/FEATURE-MAP.md](./docs/FEATURE-MAP.md) | Screens and files per feature |
| [docs/EXTENDING.md](./docs/EXTENDING.md) | Recipes for common changes |
