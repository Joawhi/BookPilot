/** Shared DTOs. Keep this file the source of truth for API shapes.
 *  Server maps Prisma rows → these types. Client never talks to Prisma.
 */

import type { GameType, MinigameType, PowerupType } from "./constants.ts";

export type FeatureStatus = "pending" | "generating" | "ready" | "failed";

export interface UserPublic {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}

export interface PageText {
  page: number;
  text: string;
}

export interface ReferencePaper {
  title: string;
  authors: string[];
  year: number | null;
  url: string;
  source: "semantic_scholar" | "openalex" | "arxiv";
  doi?: string | null;
}

export interface DocumentSummary {
  id: string;
  originalName: string;
  pageCount: number;
  hasExtractableText: boolean;
  scanWarning: string | null;
}

export interface StudySetSummary {
  id: string;
  title: string;
  createdAt: string;
  documentCount: number;
  noteCount: number;
  bestScore: number;
  totalPoints: number;
  quizStatus: FeatureStatus;
  gamesStatus: FeatureStatus;
  lastReadDocumentId: string | null;
  lastReadPage: number;
}

export interface StudySetDetail extends StudySetSummary {
  documents: DocumentSummary[];
  quizError: string | null;
  gamesError: string | null;
}

export interface ContinueReading {
  studySetId: string;
  studySetTitle: string;
  documentId: string;
  documentName: string;
  page: number;
}

export interface ConfusionPoint {
  noteId: string;
  studySetId: string;
  studySetTitle: string;
  documentId: string;
  documentName: string;
  passage: string;
  page: number;
  createdAt: string;
}

export interface HomePayload {
  studySets: StudySetSummary[];
  continueReading: ContinueReading | null;
  confusionPoints: ConfusionPoint[];
  llmEnabled: boolean;
}

export interface NoteRecord {
  id: string;
  studySetId: string;
  documentId: string;
  documentName: string;
  passage: string;
  page: number;
  explanation: string | null;
  references: ReferencePaper[];
  flagged: boolean;
  comment: string | null;
  createdAt: string;
}

export interface ExplainResponse {
  explanation: string;
  concepts: string[];
}

export interface ReferencesResponse {
  queries: string[];
  concepts: string[];
  papers: ReferencePaper[];
}

export interface SessionRecap {
  id: string;
  recap: string;
  references: ReferencePaper[];
  endedAt: string;
}

export interface QuizQuestionPublic {
  id: string;
  question: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  sourceDocumentId: string | null;
  sourcePage: number | null;
  concept: string | null;
  /** Two wrong option indexes, used only for the 50/50 powerup. */
  distractIndexes?: number[];
  hintSnippet?: string | null;
  /** Present only after the player answers, or on the review payload. */
  correctIndex?: number;
  explanation?: string;
}

export interface QuizStartPayload {
  questions: QuizQuestionPublic[];
  powerups: Record<PowerupType, number>;
  notice: string | null;
}

export interface QuizGradeRequest {
  questionId: string;
  selectedIndex: number | null;
  secondsLeft: number;
  usedPowerup: PowerupType | null;
  streakBefore: number;
  secondChanceRetry: boolean;
  doubleDown: boolean;
}

export interface QuizGradeResponse {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  pointsAwarded: number;
  newStreak: number;
  awardedPowerup: PowerupType | null;
  hintSnippet?: string | null;
}

export interface MatchPair {
  id: string;
  term: string;
  definition: string;
}

export interface FillBlankItem {
  id: string;
  sentence: string;
  answer: string;
  bank: string[];
  sourcePage: number | null;
  concept: string | null;
}

export interface TrueFalseItem {
  id: string;
  text: string;
  isTrue: boolean;
  explanation: string;
  sourcePage: number | null;
  concept: string | null;
}

export interface SequencePuzzle {
  id: string;
  title: string;
  items: { id: string; text: string }[];
  correctOrder: string[];
  concept: string | null;
}

export interface MinigamePayload {
  type: MinigameType;
  generatedAt: string;
  matchPairs?: MatchPair[];
  fillBlanks?: FillBlankItem[];
  trueFalse?: TrueFalseItem[];
  sequences?: SequencePuzzle[];
}

export interface GameResultRecord {
  id: string;
  gameType: GameType;
  score: number;
  accuracy: number;
  bestStreak: number;
  missedConcepts: string[];
  createdAt: string;
}

export interface ConceptStat {
  name: string;
  missCount: number;
  hitCount: number;
}

export interface ProgressPayload {
  notes: NoteRecord[];
  recaps: SessionRecap[];
  totalPoints: number;
  bestScores: Partial<Record<GameType, number>>;
  accuracyOverTime: { date: string; accuracy: number; gameType: GameType }[];
  topicsToReview: ConceptStat[];
  recentResults: GameResultRecord[];
}

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

export type { GameType, MinigameType, PowerupType };
