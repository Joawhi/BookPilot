import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { StudySetHubPage } from "./pages/StudySetHubPage";
import { ReaderPage } from "./pages/ReaderPage";
import { QuizPage } from "./pages/QuizPage";
import { MinigamesPage } from "./pages/MinigamesPage";
import { MatchPairsPage } from "./pages/games/MatchPairsPage";
import { FillBlankPage } from "./pages/games/FillBlankPage";
import { TrueFalsePage } from "./pages/games/TrueFalsePage";
import { SequenceSortPage } from "./pages/games/SequenceSortPage";
import { NotesProgressPage } from "./pages/NotesProgressPage";
import type { ReactNode } from "react";

function Guard({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="page">Warming the stove…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LoginPage />} />
      <Route path="/" element={<Guard><HomePage /></Guard>} />
      <Route path="/sets/:id" element={<Guard><StudySetHubPage /></Guard>} />
      <Route path="/sets/:id/read/:documentId" element={<Guard><ReaderPage /></Guard>} />
      <Route path="/sets/:id/quiz" element={<Guard><QuizPage /></Guard>} />
      <Route path="/sets/:id/games" element={<Guard><MinigamesPage /></Guard>} />
      <Route path="/sets/:id/games/match" element={<Guard><MatchPairsPage /></Guard>} />
      <Route path="/sets/:id/games/blank" element={<Guard><FillBlankPage /></Guard>} />
      <Route path="/sets/:id/games/truefalse" element={<Guard><TrueFalsePage /></Guard>} />
      <Route path="/sets/:id/games/sequence" element={<Guard><SequenceSortPage /></Guard>} />
      <Route path="/sets/:id/notes" element={<Guard><NotesProgressPage /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
