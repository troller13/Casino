import React from "react";
import { MatchRow } from "./MatchRow";
import type { Match, LoadingState } from "../types";

interface Props {
  matches: Match[];
  status: LoadingState;
  error: string | null;
  lastUpdate: Date | null;
  sportLabel: string;
  onRefresh: () => void;
}

export function OddsFeed({
  matches,
  status,
  error,
  lastUpdate,
  sportLabel,
  onRefresh,
}: Props) {
  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚡ {sportLabel.toUpperCase()}</h1>
        <div style={styles.meta}>
          {lastUpdate && (
            <span style={styles.updateInfo}>
              Actualizat:{" "}
              {lastUpdate.toLocaleTimeString("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
          <button onClick={onRefresh} style={styles.btnRefresh}>
            ↻ REFRESH
          </button>
        </div>
      </div>

      <div style={styles.colLabels}>
        <span style={{ textAlign: "left" }}>MECI</span>
        <span style={{ textAlign: "center" }}>DATA</span>
        <span style={{ textAlign: "center" }}>1</span>
        <span style={{ textAlign: "center" }}>X</span>
        <span style={{ textAlign: "center" }}>2</span>
      </div>

      <div style={styles.feed}>
        {status === "loading" && <LoadingState />}
        {status === "error" && (
          <ErrorState
            message={error ?? "Eroare necunoscută"}
            onRetry={onRefresh}
          />
        )}
        {status === "idle" && (
          <div style={styles.centerState}>
            <span style={{ fontSize: 40 }}>🔑</span>
            <p>Configurează cheia API pentru a vedea cotele.</p>
          </div>
        )}
        {status === "success" && matches.length === 0 && (
          <div style={styles.centerState}>
            <span style={{ fontSize: 40 }}>🤷</span>
            <p>Nu există meciuri disponibile acum.</p>
          </div>
        )}
        {status === "success" &&
          matches.map((match, i) => (
            <MatchRow key={match.id} match={match} animDelay={i * 50} />
          ))}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div style={info.wrap}>
      <div style={info.spinner} />
      <p style={info.text}>Se încarcă cotele...</p>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{ ...info.skeleton, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div style={{ ...info.wrap, paddingTop: 50 }}>
      <span style={{ fontSize: 48 }}>⚠️</span>
      <p style={{ ...info.text, color: "#ff2d55", marginBottom: 6 }}>
        Eroare API
      </p>
      <p style={{ ...info.text, fontSize: 11, marginBottom: 20 }}>{message}</p>
      <button onClick={onRetry} style={info.retryBtn}>
        ↻ ÎNCEARCĂ DIN NOU
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { display: "flex", flexDirection: "column", gap: 12 },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 4px",
  },
  title: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 24,
    letterSpacing: 2,
    color: "#f0f4ff",
  },
  meta: { display: "flex", alignItems: "center", gap: 12 },
  updateInfo: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#3d4660",
  },
  btnRefresh: {
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    color: "#8892a4",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    padding: "5px 12px",
    cursor: "pointer",
  },
  colLabels: {
    display: "grid",
    gridTemplateColumns: "1fr 110px 70px 70px 70px",
    gap: 8,
    padding: "8px 16px",
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: 6,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
  },
  feed: { display: "flex", flexDirection: "column", gap: 6 },
  centerState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "60px 20px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: "#3d4660",
  },
};

const info: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    padding: "40px 20px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    color: "#3d4660",
  },
  text: { color: "#3d4660", fontSize: 13 },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid rgba(255,255,255,0.06)",
    borderTopColor: "#c8f135",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  skeleton: {
    width: "100%",
    height: 68,
    background: "linear-gradient(90deg, #111520 25%, #161b2e 50%, #111520 75%)",
    backgroundSize: "600px 100%",
    animation: "shimmer 1.4s infinite",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.04)",
  },
  retryBtn: {
    background: "none",
    border: "1px solid rgba(255,45,85,0.4)",
    borderRadius: 6,
    color: "#ff2d55",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    padding: "8px 16px",
    cursor: "pointer",
  },
};
