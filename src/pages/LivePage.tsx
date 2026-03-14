import React, { useState, useCallback } from "react";
import { SportSidebar } from "../components/SportSidebar";
import { BetSlip } from "../components/BetSlip";
import { OddsFeed } from "../components/OddsFeed";
import { RightSidebar } from "../components/RightSidebar";
import { ApiKeyModal } from "../components/ApiKeyModal";
import { BetPlacedModal } from "../components/BetPlacedModal";
import { useAppStore } from "../store/AppStore";
import { useOdds } from "../hooks/useOdds";
import { computeStats } from "../services/api";
import { SPORT_OPTIONS, DEFAULT_SPORT } from "../services/config";

interface BetResult {
  stake: number;
  totalOdds: number;
  potentialWin: number;
}

export function LivePage() {
  const { state } = useAppStore();
  const [sport, setSport] = useState(DEFAULT_SPORT);
  const [showApiModal, setShowApiModal] = useState(!state.apiKey);
  const [betResult, setBetResult] = useState<BetResult | null>(null);

  const { matches, status, error, lastUpdate, reload } = useOdds(
    state.apiKey,
    sport,
  );
  const stats = computeStats(matches);
  const found = SPORT_OPTIONS.find((s) => s.key === sport);
  const sportLabel = found ? `${found.icon} ${found.label}` : sport;

  const handleBetPlaced = useCallback(
    (stake: number, totalOdds: number, potentialWin: number) => {
      setBetResult({ stake, totalOdds, potentialWin });
    },
    [],
  );

  return (
    <div style={s.wrap}>
      {!state.apiKey && !showApiModal && (
        <div style={s.noKeyBanner}>
          <span>🔑 Nicio cheie API configurată.</span>
          <button onClick={() => setShowApiModal(true)} style={s.configurBtn}>
            CONFIGUREAZĂ API
          </button>
        </div>
      )}
      {state.apiKey && (
        <div style={s.apiBar}>
          <span style={s.apiConnected}>● API CONECTAT</span>
          <button onClick={() => setShowApiModal(true)} style={s.changeKeyBtn}>
            schimbă cheia
          </button>
        </div>
      )}

      <div style={s.main}>
        <aside style={s.leftAside}>
          <SportSidebar active={sport} onChange={setSport} />
          <BetSlip onBetPlaced={handleBetPlaced} />
        </aside>
        <OddsFeed
          matches={matches}
          status={status}
          error={error}
          lastUpdate={lastUpdate}
          sportLabel={sportLabel}
          onRefresh={reload}
        />
        <RightSidebar matches={matches} stats={stats} />
      </div>

      {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
      {betResult && (
        <BetPlacedModal
          stake={betResult.stake}
          totalOdds={betResult.totalOdds}
          potentialWin={betResult.potentialWin}
          onClose={() => setBetResult(null)}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column" },
  noKeyBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: "12px 24px",
    background: "rgba(255,45,85,0.08)",
    borderBottom: "1px solid rgba(255,45,85,0.2)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: "#8892a4",
  },
  configurBtn: {
    background: "#ff2d55",
    color: "#fff",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    letterSpacing: 2,
    padding: "6px 16px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  apiBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "6px 28px",
    background: "rgba(200,241,53,0.04)",
    borderBottom: "1px solid rgba(200,241,53,0.08)",
  },
  apiConnected: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#c8f135",
  },
  changeKeyBtn: {
    background: "none",
    border: "none",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
    cursor: "pointer",
    textDecoration: "underline",
  },
  main: {
    maxWidth: 1580,
    margin: "0 auto",
    width: "100%",
    display: "grid",
    gridTemplateColumns: "240px 1fr 270px",
    gap: 16,
    padding: "20px 24px 48px",
    alignItems: "start",
  },
  leftAside: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    position: "sticky",
    top: 104,
    alignSelf: "start",
    maxHeight: "calc(100vh - 120px)",
    overflowY: "auto",
  },
};
