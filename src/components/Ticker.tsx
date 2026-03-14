import React from "react";

const ITEMS = [
  "⚽ Chelsea vs Arsenal — 1 1.85 | X 3.40 | 2 4.20",
  "🏀 Lakers vs Celtics — 1 1.95 | 2 1.88",
  "🎾 Djokovic vs Alcaraz — 1 1.45 | 2 2.75",
  "⚽ Real Madrid vs Barcelona — 1 2.10 | X 3.25 | 2 3.50",
  "🏒 Canadiens vs Bruins — 1 2.20 | 2 1.70",
  "🏈 Chiefs vs Eagles — 1 1.60 | 2 2.35",
  "⚽ PSG vs Marseille — 1 1.55 | X 4.00 | 2 5.50",
];

export function Ticker() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div style={styles.wrap}>
      <span style={styles.label}>LIVE</span>
      <div style={styles.viewport}>
        <div style={styles.track}>
          {doubled.map((item, i) => (
            <span key={i} style={styles.item}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: "relative",
    zIndex: 10,
    height: 36,
    background: "#0d1017",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  },
  label: {
    flexShrink: 0,
    background: "#ff2d55",
    color: "#fff",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 13,
    letterSpacing: 3,
    padding: "0 16px",
    height: "100%",
    display: "flex",
    alignItems: "center",
    zIndex: 2,
  },
  viewport: { overflow: "hidden", flex: 1 },
  track: {
    display: "flex",
    gap: 64,
    whiteSpace: "nowrap",
    animation: "tickerScroll 45s linear infinite",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: "#8892a4",
    paddingLeft: 32,
  },
  item: { flexShrink: 0 },
};
