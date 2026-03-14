import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store/AppStore";
import type { Selection } from "../types/index.ts";
import type { CreateSportBetInput } from "../services/supabase.ts";

interface QuickBetState {
  x: number;
  y: number;
  selection: Selection;
  matchData: {
    homeTeam: string;
    awayTeam: string;
    commenceTime: string;
    sportKey: string;
  };
}

// Global event bus for quick bet
let _showQuickBet: ((state: QuickBetState) => void) | null = null;

export function triggerQuickBet(state: QuickBetState) {
  _showQuickBet?.(state);
}

export function QuickBetOverlay() {
  const { state, placeSportBet, showToast } = useAppStore();
  const [qb, setQB] = useState<QuickBetState | null>(null);
  const [selectedAmt, setSelectedAmt] = useState(50);
  const [placing, setPlacing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    _showQuickBet = setQB;
    return () => {
      _showQuickBet = null;
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!qb) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setQB(null);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [qb]);

  if (!qb) return null;

  const odds = qb.selection.odd;
  const win = parseFloat((selectedAmt * odds).toFixed(2));

  // Adjust position to stay in viewport
  const x = Math.min(qb.x, window.innerWidth - 240);
  const y = Math.min(qb.y, window.innerHeight - 260);

  async function handleQuickBet() {
    if (!qb) return;
    if (selectedAmt > state.balance) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }
    setPlacing(true);
    const input: Omit<CreateSportBetInput, "user_id"> = {
      sport_key: qb.matchData.sportKey,
      match_id: qb.selection.matchId,
      home_team: qb.matchData.homeTeam,
      away_team: qb.matchData.awayTeam,
      commence_time: qb.matchData.commenceTime,
      selections: [qb.selection],
      total_odds: qb.selection.odd,
      stake: selectedAmt,
      potential_win: win,
    };
    const ok = await placeSportBet(input);
    if (ok) {
      showToast(
        `⚡ Pariu rapid plasat! ${selectedAmt} MDL @ ${odds.toFixed(2)}×`,
        "success",
      );
      setQB(null);
    } else {
      showToast("❌ Eroare!", "error");
    }
    setPlacing(false);
  }

  return (
    <div ref={ref} style={{ ...s.popup, left: x, top: y }}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerLabel}>⚡ PARIU RAPID</span>
        <button onClick={() => setQB(null)} style={s.closeBtn}>
          ✕
        </button>
      </div>

      {/* Selection info */}
      <div style={s.selInfo}>
        <span style={s.selMatch}>{qb.selection.matchLabel}</span>
        <div style={s.selPickRow}>
          <span style={s.pickLabel}>{qb.selection.pickLabel}</span>
          <span style={s.selPick}>{qb.selection.pick}</span>
          <span style={s.selOdd}>{odds.toFixed(2)}×</span>
        </div>
      </div>

      {/* Quick amounts */}
      <div style={s.amounts}>
        {[20, 50, 100, 200].map((v) => (
          <button
            key={v}
            onClick={() => setSelectedAmt(v)}
            style={{ ...s.amtBtn, ...(selectedAmt === v ? s.amtBtnOn : {}) }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Potential win */}
      <div style={s.winRow}>
        <span style={s.winLbl}>Câștig potențial</span>
        <span style={s.winAmt}>{win.toFixed(2)} MDL</span>
      </div>

      {/* Place button */}
      <button
        onClick={handleQuickBet}
        disabled={placing}
        style={{ ...s.btnPlace, opacity: placing ? 0.7 : 1 }}
      >
        {placing ? "⏳..." : `PLASEAZĂ — ${selectedAmt} MDL`}
      </button>

      <div style={s.disclaimer}>
        Sold: {state.balance.toLocaleString("ro-RO")} MDL
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  popup: {
    position: "fixed",
    zIndex: 9000,
    background: "#0d1017",
    border: "1px solid rgba(200,241,53,0.3)",
    borderRadius: 12,
    padding: "14px",
    width: 220,
    boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
    animation: "fadeInUp 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLabel: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 14,
    letterSpacing: 2,
    color: "#c8f135",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#3d4660",
    fontSize: 11,
    cursor: "pointer",
  },
  selInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "8px 10px",
    background: "#111520",
    borderRadius: 8,
  },
  selMatch: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    color: "#f0f4ff",
    lineHeight: 1.3,
  },
  selPickRow: { display: "flex", alignItems: "center", gap: 6 },
  pickLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    color: "#3d4660",
    background: "#161b2e",
    padding: "1px 5px",
    borderRadius: 3,
  },
  selPick: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 11,
    color: "#8892a4",
    flex: 1,
  },
  selOdd: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    color: "#c8f135",
  },
  amounts: { display: "flex", gap: 5 },
  amtBtn: {
    flex: 1,
    padding: "7px 0",
    background: "#161b2e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#8892a4",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  amtBtnOn: {
    borderColor: "#c8f135",
    color: "#c8f135",
    background: "rgba(200,241,53,0.1)",
  },
  winRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  winLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  winAmt: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    color: "#c8f135",
  },
  btnPlace: {
    width: "100%",
    background: "linear-gradient(135deg, #c8f135, #a0cc00)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 14,
    letterSpacing: 2,
    padding: "10px 0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  disclaimer: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    color: "#252c40",
    textAlign: "center" as const,
  },
};
