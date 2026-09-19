# Feature map

Each feature is a vertical slice: route + service + page. Use this table to jump to files.

## 1. Auth + Home + upload

| Piece | File |
|---|---|
| Register / login | `server/src/routes/auth.ts` |
| Auth context | `client/src/auth/AuthContext.tsx` |
| Login / signup UI | `client/src/pages/LoginPage.tsx` |
| Home payload | `server/src/routes/home.ts` |
| Home UI + drop zone | `client/src/pages/HomePage.tsx` |
| Create set + extract | `server/src/routes/studySets.ts`, `services/pdfExtract.ts` |

## 2. Study Set hub + Reader

| Piece | File |
|---|---|
| Hub | `client/src/pages/StudySetHubPage.tsx` |
| Status chips | `client/src/components/StatusChip.tsx` |
| PDF render + text layer | `client/src/pages/ReaderPage.tsx`, `components/reader/PdfPane.tsx` |
| Selection toolbar | `components/reader/SelectionToolbar.tsx` |
| Explain / refs / session | `server/src/routes/reader.ts` |
| Notes CRUD | `server/src/routes/notes.ts` |

## 3. Quiz

| Piece | File |
|---|---|
| Generate | `server/src/services/generation.ts` (`generateQuiz`) |
| Grade / finish | `server/src/routes/quiz.ts` |
| Scoring math | `server/src/services/scoring.ts` |
| UI | `client/src/pages/QuizPage.tsx` |
| Powerups | `client/src/components/games/PowerupBar.tsx` |

## 4. Minigames

| Piece | File |
|---|---|
| Lobby | `client/src/pages/MinigamesPage.tsx` |
| Match pairs | `client/src/pages/games/MatchPairsPage.tsx` |
| Fill the blank | `client/src/pages/games/FillBlankPage.tsx` |
| True/false blitz | `client/src/pages/games/TrueFalsePage.tsx` |
| Sequence sort | `client/src/pages/games/SequenceSortPage.tsx` |
| Content API | `server/src/routes/minigames.ts` |

All four share timer + Freeze Time + Double Down via `client/src/components/games/GameShell.tsx`.

## 5. Notes & Progress

| Piece | File |
|---|---|
| API | `server/src/routes/progress.ts` |
| Page | `client/src/pages/NotesProgressPage.tsx` |
| Sparkline | `client/src/components/AccuracyChart.tsx` |

## Background generation

`server/src/services/generation.ts` — sampled by `denseSample.ts`, prompted in `llm/prompts.ts`.
