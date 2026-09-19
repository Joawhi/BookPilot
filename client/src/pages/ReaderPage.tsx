import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PdfPane } from "../components/reader/PdfPane";
import { SelectionToolbar } from "../components/reader/SelectionToolbar";
import { PaperList, SidePanel } from "../components/reader/SidePanel";
import { apiGet, apiPatch, apiPost, getToken } from "../api/client";
import type {
  ExplainResponse,
  NoteRecord,
  ReferencesResponse,
  SessionRecap,
  StudySetDetail,
} from "@shared/types";

export function ReaderPage() {
  const { id, documentId } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [set, setSet] = useState<StudySetDetail | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [panel, setPanel] = useState<"explain" | "refs" | "note" | "recap" | null>(null);
  const [explanation, setExplanation] = useState("");
  const [refs, setRefs] = useState<ReferencesResponse | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recap, setRecap] = useState<SessionRecap | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const page = Math.max(1, Number(params.get("page") || 1));

  useEffect(() => {
    if (!id) return;
    apiGet<StudySetDetail>(`/api/study-sets/${id}`).then(setSet);
  }, [id]);

  useEffect(() => {
    if (!id || !documentId) return;
    apiPost<{ id: string }>("/api/reader/sessions", { studySetId: id, documentId }).then((r) => setSessionId(r.id));
  }, [id, documentId]);

  useEffect(() => {
    if (!documentId) return;
    let objectUrl: string | null = null;
    const token = getToken();
    fetch(`/api/documents/${documentId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error("Could not load PDF");
        return r.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setBlobUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId]);

  const goPage = useCallback(
    (n: number) => {
      const next = Math.min(pageCount, Math.max(1, n));
      setParams({ page: String(next) }, { replace: true });
      if (id && documentId) apiPatch(`/api/study-sets/${id}/progress`, { documentId, page: next });
    },
    [pageCount, setParams, id, documentId],
  );

  const onPageCount = useCallback((n: number) => setPageCount(n), []);

  const passage = selection?.text ?? "";

  async function explain() {
    if (!documentId || !passage) return;
    setBusy(true);
    setPanel("explain");
    try {
      const res = await apiPost<ExplainResponse>("/api/reader/explain", {
        documentId,
        page,
        passage,
      });
      setExplanation(res.explanation);
    } finally {
      setBusy(false);
    }
  }

  async function findRefs() {
    if (!documentId || !passage) return;
    setBusy(true);
    setPanel("refs");
    try {
      const res = await apiPost<ReferencesResponse>("/api/reader/references", {
        documentId,
        page,
        passage,
      });
      setRefs(res);
    } finally {
      setBusy(false);
    }
  }

  async function saveNote(flagged: boolean) {
    if (!id || !documentId || !passage) return;
    const note = await apiPost<NoteRecord>("/api/notes", {
      studySetId: id,
      documentId,
      passage,
      page,
      explanation: explanation || undefined,
      references: refs?.papers ?? [],
      flagged,
      comment: comment || undefined,
    });
    setSavedMsg(flagged ? "Flagged as confusing." : "Note saved.");
    setPanel("note");
    return note;
  }

  async function endSession() {
    if (!sessionId) return;
    setBusy(true);
    try {
      const rec = await apiPost<SessionRecap>(`/api/reader/sessions/${sessionId}/end`);
      setRecap(rec);
      setPanel("recap");
    } finally {
      setBusy(false);
    }
  }

  const tabs = useMemo(() => set?.documents ?? [], [set]);

  return (
    <div className="reader-page">
      <div className="reader-chrome">
        <Link to={`/sets/${id}`} className="muted" style={{ textDecoration: "none" }}>
          ← Hub
        </Link>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {tabs.map((d) => (
            <Link
              key={d.id}
              to={`/sets/${id}/read/${d.id}`}
              className="chip"
              style={{ background: d.id === documentId ? "var(--sunflower)" : undefined, textDecoration: "none" }}
            >
              {d.originalName}
            </Link>
          ))}
        </div>
        <button className="btn ghost" type="button" onClick={() => goPage(page - 1)} disabled={page <= 1}>
          Prev
        </button>
        <span>
          {page} / {pageCount}
        </span>
        <button className="btn ghost" type="button" onClick={() => goPage(page + 1)} disabled={page >= pageCount}>
          Next
        </button>
        <button className="btn ghost" type="button" onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}>
          −
        </button>
        <button className="btn ghost" type="button" onClick={() => setScale((s) => Math.min(2, s + 0.15))}>
          +
        </button>
        <button className="btn beet" type="button" onClick={endSession} disabled={busy}>
          End session
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, padding: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, overflow: "auto", display: "flex", justifyContent: "center", minHeight: "80vh" }}>
          <div style={{ position: "relative" }}>
            {blobUrl ? (
              <PdfPane url={blobUrl} page={page} scale={scale} onPageCount={onPageCount} onSelect={setSelection} />
            ) : (
              <p className="muted">Opening the manuscript…</p>
            )}
            {selection ? (
              <SelectionToolbar
                x={selection.x}
                y={selection.y}
                onExplain={explain}
                onRefs={findRefs}
                onFlag={() => saveNote(true)}
                onNote={() => {
                  setPanel("note");
                }}
              />
            ) : null}
          </div>
        </div>
        {panel ? (
          <SidePanel
            title={
              panel === "explain"
                ? "Explanation"
                : panel === "refs"
                  ? "Real references"
                  : panel === "recap"
                    ? "Session recap"
                    : "Save note"
            }
            onClose={() => setPanel(null)}
          >
            {busy ? <p className="muted">Thinking…</p> : null}
            {panel === "explain" ? <p>{explanation || "Select a passage and tap Explain."}</p> : null}
            {panel === "refs" ? (
              <>
                {refs?.queries?.length ? (
                  <p className="muted">Queries: {refs.queries.join(" · ")}</p>
                ) : null}
                <PaperList papers={refs?.papers ?? []} />
              </>
            ) : null}
            {panel === "note" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveNote(false);
                }}
              >
                <p className="muted">{passage.slice(0, 280)}</p>
                <label className="field">
                  Personal comment
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
                </label>
                <button className="btn beet" style={{ marginTop: 10 }}>
                  Save note
                </button>
                {savedMsg ? <p className="muted">{savedMsg}</p> : null}
              </form>
            ) : null}
            {panel === "recap" && recap ? (
              <div>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)" }}>{recap.recap}</pre>
                <PaperList papers={recap.references} />
                <button className="btn" type="button" onClick={() => nav(`/sets/${id}/notes`)} style={{ marginTop: 12 }}>
                  Open notes
                </button>
              </div>
            ) : null}
          </SidePanel>
        ) : null}
      </div>
    </div>
  );
}
