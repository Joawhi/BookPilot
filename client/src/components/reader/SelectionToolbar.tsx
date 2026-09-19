export function SelectionToolbar({
  x,
  y,
  onExplain,
  onRefs,
  onFlag,
  onNote,
}: {
  x: number;
  y: number;
  onExplain: () => void;
  onRefs: () => void;
  onFlag: () => void;
  onNote: () => void;
}) {
  return (
    <div className="selection-toolbar" style={{ left: x, top: y, transform: "translate(-50%, -100%)" }}>
      <button type="button" onClick={onExplain}>
        Explain
      </button>
      <button type="button" onClick={onRefs}>
        Find references
      </button>
      <button type="button" onClick={onFlag}>
        Flag as confusing
      </button>
      <button type="button" onClick={onNote}>
        Save note
      </button>
    </div>
  );
}
