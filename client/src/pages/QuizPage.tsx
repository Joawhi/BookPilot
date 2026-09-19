import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GameShell, useGameTimer } from "../components/games/GameShell";
import { apiGet, apiPost } from "../api/client";
import { celebrate } from "../lib/celebrate";
import { QUIZ_SECONDS, startingInventory } from "./gameHelpers";
import type { PowerupType, QuizGradeResponse, QuizQuestionPublic, QuizStartPayload } from "@shared/types";

export function QuizPage() {
  const { id } = useParams();
  const [questions, setQuestions] = useState<QuizQuestionPublic[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [inventory, setInventory] = useState(startingInventory());
  const [used, setUsed] = useState<PowerupType | null>(null);
  const [double, setDouble] = useState(false);
  const [hidden, setHidden] = useState<number[]>([]);
  const [retry, setRetry] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<QuizGradeResponse | null>(null);
  const [missed, setMissed] = useState<{ q: QuizQuestionPublic; explanation: string }[]>([]);
  const missedRef = useRef<{ q: QuizQuestionPublic; explanation: string }[]>([]);
  const [hits, setHits] = useState<string[]>([]);
  const [missConcepts, setMissConcepts] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useGameTimer(QUIZ_SECONDS);
  const grading = useRef(false);

  useEffect(() => {
    if (!id) return;
    apiGet<QuizStartPayload>(`/api/study-sets/${id}/quiz`)
      .then((p) => {
        setQuestions(p.questions);
        setInventory(p.powerups);
        setNotice(p.notice ?? null);
      })
      .catch((err) => setError(err.body?.error ?? "Quiz is not ready yet."));
  }, [id]);

  const q = questions[index];

  async function grade(selectedIndex: number | null) {
    if (!id || !q || feedback || grading.current) return;
    grading.current = true;
    timer.setRunning(false);
    const res = await apiPost<QuizGradeResponse>(`/api/study-sets/${id}/quiz/grade`, {
      questionId: q.id,
      selectedIndex,
      secondsLeft: timer.left,
      usedPowerup: used,
      streakBefore: streak,
      secondChanceRetry: retry,
      doubleDown: double,
    });
    if (!res.correct && used === "second_chance" && !retry) {
      setRetry(true);
      grading.current = false;
      timer.setRunning(true);
      return;
    }
    setFeedback(res);
    scoreRef.current += res.pointsAwarded;
    setScore(scoreRef.current);
    setStreak(res.newStreak);
    setBestStreak((b) => Math.max(b, res.newStreak));
    if (res.newStreak === 3 || res.newStreak === 5) celebrate("streak");
    if (res.awardedPowerup) {
      setInventory((inv) => ({ ...inv, [res.awardedPowerup!]: inv[res.awardedPowerup!] + 1 }));
    }
    if (res.correct) {
      if (q.concept) setHits((h) => [...h, q.concept!]);
    } else {
      const item = { q: { ...q, explanation: res.explanation, correctIndex: res.correctIndex }, explanation: res.explanation };
      missedRef.current = [...missedRef.current, item];
      setMissed(missedRef.current);
      if (q.concept) setMissConcepts((h) => [...h, q.concept!]);
    }
    grading.current = false;
  }

  useEffect(() => {
    if (timer.left === 0 && q && !feedback && !done) void grade(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.left]);

  async function finishNow() {
    if (!id) return;
    setDone(true);
    timer.setRunning(false);
    celebrate("win");
    const answered = questions.length;
    const correct = answered - missedRef.current.length;
    await apiPost(`/api/study-sets/${id}/quiz/finish`, {
      score: scoreRef.current,
      accuracy: answered ? correct / answered : 0,
      bestStreak,
      missedConcepts: missConcepts,
      hitConcepts: hits,
    });
  }

  function next() {
    if (index + 1 >= questions.length) {
      void finishNow();
      return;
    }
    setIndex((i) => i + 1);
    setFeedback(null);
    setUsed(null);
    setDouble(false);
    setHidden([]);
    setRetry(false);
    setHint(null);
    timer.reset(QUIZ_SECONDS);
    timer.setRunning(true);
  }

  function onPowerup(type: PowerupType) {
    if (used || inventory[type] <= 0 || feedback) return;
    setInventory((inv) => ({ ...inv, [type]: inv[type] - 1 }));
    setUsed(type);
    if (type === "freeze_time") timer.freeze();
    if (type === "double_down") setDouble(true);
    if (type === "fifty_fifty" && q) setHidden(q.distractIndexes ?? []);
    if (type === "hint") setHint(q?.hintSnippet || `Hint: see page ${q?.sourcePage ?? "?"} in the reader.`);
  }

  const accuracy = useMemo(() => {
    if (!done || questions.length === 0) return 0;
    return (questions.length - missed.length) / questions.length;
  }, [done, questions.length, missed.length]);

  if (error) {
    return (
      <div className="page">
        <div className="error-banner">{error}</div>
        <Link to={`/sets/${id}`}>Back to hub</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="page">
        <img src="/art/celebrate.png" alt="" style={{ width: 360, maxWidth: "100%", borderRadius: 24, border: "3px solid var(--ink)" }} />
        <h1>Harvest complete</h1>
        <p>
          Score <strong>{score}</strong> · Accuracy {Math.round(accuracy * 100)}% · Best streak {bestStreak}
        </p>
        <h3>Missed questions</h3>
        {missed.length === 0 ? <p className="muted">Clean sweep.</p> : null}
        {missed.map((m) => (
          <div key={m.q.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
            <div>{m.q.question}</div>
            <p className="muted">{m.explanation}</p>
            {m.q.sourceDocumentId ? (
              <Link to={`/sets/${id}/read/${m.q.sourceDocumentId}?page=${m.q.sourcePage ?? 1}`}>Review in reader</Link>
            ) : null}
          </div>
        ))}
        <Link className="btn" to={`/sets/${id}`}>
          Back to hub
        </Link>
      </div>
    );
  }

  if (!q) return <div className="page">Shuffling the deck…</div>;

  return (
    <GameShell
      title="Quiz"
      subtitle={`${index + 1} / ${questions.length} · ${q.difficulty}`}
      score={score}
      streak={streak}
      left={timer.left}
      frozen={timer.frozen}
      inventory={inventory}
      powerupsDisabled={Boolean(used || feedback)}
      onPowerup={onPowerup}
    >
      {notice ? <div className="error-banner" style={{ marginBottom: 16 }}>{notice}</div> : null}
      <div className="card embroidered" style={{ padding: 24 }}>
        <h2>{q.question}</h2>
        {hint ? <p className="muted">{hint}</p> : null}
        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          {q.options.map((opt, i) => {
            if (hidden.includes(i) && !feedback) return null;
            const correct = feedback && i === feedback.correctIndex;
            const pickedWrong = feedback && !feedback.correct && !correct;
            return (
              <button
                key={opt + i}
                className="btn ghost"
                type="button"
                disabled={Boolean(feedback)}
                onClick={() => grade(i)}
                style={{
                  justifyContent: "flex-start",
                  background: correct ? "#e5f0d8" : pickedWrong ? "#f7d5cf" : undefined,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {feedback ? (
          <div style={{ marginTop: 16 }}>
            <p>
              {feedback.correct ? "Ripe answer." : "Not quite."} {feedback.explanation}
            </p>
            <p className="muted">
              {feedback.pointsAwarded >= 0 ? "+" : ""}
              {feedback.pointsAwarded} points
            </p>
            <button className="btn beet" type="button" onClick={next}>
              {index + 1 >= questions.length ? "See results" : "Next"}
            </button>
          </div>
        ) : null}
      </div>
    </GameShell>
  );
}
