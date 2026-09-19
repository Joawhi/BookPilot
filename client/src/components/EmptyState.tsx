export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card embroidered" style={{ padding: 28, textAlign: "center" }}>
      <img src="/art/empty-fox.png" alt="" style={{ width: 220, maxWidth: "100%" }} />
      <h3>{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}
