import type { ReactNode } from "react";
import type { ReferencePaper } from "@shared/types";

export function SidePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <aside
      className="paper-card"
      style={{
        width: 360,
        flexShrink: 0,
        padding: 18,
        alignSelf: "stretch",
        overflowY: "auto",
        maxHeight: "calc(100vh - 70px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button className="btn ghost" type="button" onClick={onClose} style={{ padding: "4px 10px" }}>
          Close
        </button>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </aside>
  );
}

export function PaperList({ papers }: { papers: ReferencePaper[] }) {
  if (papers.length === 0) {
    return <p className="muted">No matching papers from Semantic Scholar, OpenAlex, or arXiv yet. Try a more specific passage.</p>;
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
      {papers.map((p) => (
        <li key={p.url} className="paper-card" style={{ padding: 12, boxShadow: "none" }}>
          <a href={p.url} target="_blank" rel="noreferrer">
            <strong>{p.title}</strong>
          </a>
          <div className="muted" style={{ fontSize: "0.9rem" }}>
            {p.authors.slice(0, 3).join(", ")}
            {p.authors.length > 3 ? " et al." : ""} {p.year ? `· ${p.year}` : ""} · {p.source.replace("_", " ")}
          </div>
        </li>
      ))}
    </ul>
  );
}
