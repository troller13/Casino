import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "../store/AppStore";
import { useThemedStyles } from "../store/ThemeContext";
import { useOdds } from "../hooks/useOdds";
import { useFavorites } from "../hooks/useFavorites";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { useLiveOdds } from "../hooks/useLiveOdds";
import { computeStats } from "../services/api";
import { SPORT_OPTIONS, DEFAULT_SPORT } from "../services/config";
import { MatchRow } from "../components/MatchRow";
import { ApiKeyModal } from "../components/ApiKeyModal";
import { BetPlacedModal } from "../components/BetPlacedModal";
import type { CreateSportBetInput } from "../services/supabase.ts";

type TimeFilter = "all" | "today" | "tomorrow" | "week" | "live";
type BetMode = "express" | "system";
interface BetResult {
  stake: number;
  totalOdds: number;
  potentialWin: number;
}

export function LivePage() {
  const {
    state,
    placeSportBet,
    clearSelections,
    totalOdds,
    potentialWin,
    showToast,
    removeSelection,
  } = useAppStore();
  const t = useThemedStyles();
  const [sport, setSport] = useState(DEFAULT_SPORT);
  const [showApiModal, setShowApiModal] = useState(!state.apiKey);
  const [betResult, setBetResult] = useState<BetResult | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [stake, setStake] = useState("");
  const [betMode, setBetMode] = useState<BetMode>("express");
  const [placing, setPlacing] = useState(false);
  const [slipOpen, setSlipOpen] = useState(false);

  const { matches, status, error, lastUpdate, reload } = useOdds(
    state.apiKey,
    sport,
  );
  const { favorites, isFav, toggleFav } = useFavorites(state.user?.id);
  const {
    history: searchHistory,
    addSearch,
    clearHistory,
  } = useSearchHistory();
  const { oddsChanges } = useLiveOdds(state.apiKey, matches);

  const stakeNum = parseFloat(stake) || 0;
  const winAmount = potentialWin(stakeNum);
  const selCount = state.selections.length;

  // System bet calculation (2/3 minimum)
  const systemWin =
    betMode === "system" && selCount >= 3
      ? (() => {
          const combos: number[][] = [];
          const sels = state.selections;
          for (let i = 0; i < sels.length; i++)
            for (let j = i + 1; j < sels.length; j++) combos.push([i, j]);
          const avgOdds =
            combos.reduce(
              (s, c) => s + c.reduce((p, idx) => p * sels[idx].odd, 1),
              0,
            ) / combos.length;
          return parseFloat((stakeNum * avgOdds * 0.7).toFixed(2));
        })()
      : winAmount;

  useEffect(() => {
    if (selCount > 0) setSlipOpen(true);
  }, [selCount]);

  // Filter matches
  const now = new Date();
  const filteredMatches = matches
    .filter((m) => {
      const d = new Date(m.commence_time);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      const tmStart = new Date(now);
      tmStart.setDate(now.getDate() + 1);
      tmStart.setHours(0, 0, 0, 0);
      const tmEnd = new Date(now);
      tmEnd.setDate(now.getDate() + 1);
      tmEnd.setHours(23, 59, 59, 999);
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      const passTime =
        timeFilter === "all"
          ? true
          : timeFilter === "live"
            ? d <= now
            : timeFilter === "today"
              ? d <= todayEnd
              : timeFilter === "tomorrow"
                ? d >= tmStart && d <= tmEnd
                : d <= weekEnd;
      const passSearch =
        !search.trim() ||
        m.home_team.toLowerCase().includes(search.toLowerCase()) ||
        m.away_team.toLowerCase().includes(search.toLowerCase());
      return passTime && passSearch;
    })
    .sort((a, b) => {
      const aFav = isFav(a.id) ? -1 : 0;
      const bFav = isFav(b.id) ? -1 : 0;
      return (
        aFav - bFav ||
        new Date(a.commence_time).getTime() -
          new Date(b.commence_time).getTime()
      );
    });

  const liveCount = matches.filter(
    (m) => new Date(m.commence_time) <= now,
  ).length;

  async function handlePlaceBet() {
    if (!selCount) {
      showToast("⚠️ Adaugă selecții!", "error");
      return;
    }
    if (stakeNum < 1) {
      showToast("⚠️ Suma minimă 1 MDL!", "error");
      return;
    }
    if (stakeNum > state.balance) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }
    setPlacing(true);
    const firstSel = state.selections[0];
    const matchData = matches.find((m) => m.id === firstSel.matchId);
    const input: Omit<CreateSportBetInput, "user_id"> = {
      sport_key: sport,
      match_id: firstSel.matchId,
      home_team: matchData?.home_team ?? firstSel.matchLabel.split(" vs ")[0],
      away_team:
        matchData?.away_team ?? firstSel.matchLabel.split(" vs ")[1] ?? "",
      commence_time: matchData?.commence_time ?? new Date().toISOString(),
      selections: state.selections,
      total_odds: totalOdds,
      stake: stakeNum,
      potential_win: systemWin,
    };
    const ok = await placeSportBet(input);
    if (ok) {
      setBetResult({ stake: stakeNum, totalOdds, potentialWin: systemWin });
      setStake("");
      setSlipOpen(false);
    } else showToast("❌ Eroare la plasarea pariului!", "error");
    setPlacing(false);
  }

  const handleSearch = (q: string) => {
    setSearch(q);
    if (q.length >= 2) addSearch(q);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: t.bgBase,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      <style>{`
        @keyframes slipSlide { from{transform:translateX(105%)} to{transform:translateX(0)} }
        @keyframes oddsUp    { 0%{color:#c8f135;transform:scale(1.1)} 100%{color:inherit;transform:scale(1)} }
        @keyframes oddsDown  { 0%{color:#ff2d55;transform:scale(0.95)} 100%{color:inherit;transform:scale(1)} }
      `}</style>

      {/* ── SPORT TABS ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 20px",
          background: t.bgSurface,
          borderBottom: `1px solid ${t.border}`,
          overflowX: "auto",
        }}
      >
        {state.apiKey ? (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              letterSpacing: 2,
              color: "#c8f135",
              flexShrink: 0,
            }}
          >
            ● LIVE
          </span>
        ) : (
          <button
            onClick={() => setShowApiModal(true)}
            style={{
              background: "#ff2d55",
              color: "#fff",
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 13,
              letterSpacing: 1,
              padding: "5px 12px",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            🔑 API
          </button>
        )}
        <div style={{ display: "flex", gap: 4, flex: 1, overflowX: "auto" }}>
          {SPORT_OPTIONS.map((sp) => (
            <button
              key={sp.key}
              onClick={() => setSport(sp.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
                padding: "6px 12px",
                background: sport === sp.key ? t.accentBg : "none",
                border: `1px solid ${sport === sp.key ? t.accent + "44" : t.border}`,
                borderRadius: 20,
                color: sport === sp.key ? t.accent : t.text3,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "'Syne', sans-serif",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span>{sp.icon}</span>
              <span>{sp.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={reload}
          style={{
            background: "none",
            border: `1px solid ${t.border}`,
            borderRadius: 6,
            color: t.text3,
            fontSize: 15,
            width: 32,
            height: 32,
            cursor: "pointer",
            flexShrink: 0,
          }}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* ── FILTERS ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 20px",
          background: t.bgCard,
          borderBottom: `1px solid ${t.border}`,
          flexWrap: "wrap" as const,
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {(
            [
              { id: "all", label: "TOATE" },
              {
                id: "live",
                label: `🔴 LIVE${liveCount > 0 ? ` (${liveCount})` : ""}`,
              },
              { id: "today", label: "AZI" },
              { id: "tomorrow", label: "MÂINE" },
              { id: "week", label: "SĂPTĂMÂNA" },
            ] as { id: TimeFilter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id)}
              style={{
                padding: "5px 10px",
                background:
                  timeFilter === f.id ? "rgba(0,229,255,0.08)" : "none",
                border: `1px solid ${timeFilter === f.id ? "rgba(0,229,255,0.3)" : t.border}`,
                borderRadius: 20,
                color: timeFilter === f.id ? "#00e5ff" : t.text3,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search with history */}
        <div style={{ position: "relative", flex: 1, maxWidth: 260 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: t.bgInput,
              border: `1px solid ${searchFocused ? t.accent + "44" : t.border}`,
              borderRadius: 20,
              padding: "5px 12px",
            }}
          >
            <span style={{ fontSize: 11 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Caută echipă..."
              style={{
                background: "none",
                border: "none",
                outline: "none",
                color: t.text1,
                fontFamily: "'Syne', sans-serif",
                fontSize: 12,
                flex: 1,
                minWidth: 0,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  background: "none",
                  border: "none",
                  color: t.text3,
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            )}
          </div>
          {/* Search history dropdown */}
          {searchFocused && searchHistory.length > 0 && !search && (
            <div
              style={{
                position: "absolute",
                top: "110%",
                left: 0,
                right: 0,
                background: t.bgSurface,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                zIndex: 100,
                overflow: "hidden",
                boxShadow: t.shadow,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 12px 4px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    color: t.text3,
                    letterSpacing: 2,
                  }}
                >
                  CĂUTĂRI RECENTE
                </span>
                <button
                  onClick={clearHistory}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    color: t.text3,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Șterge
                </button>
              </div>
              {searchHistory.map((h) => (
                <div
                  key={h}
                  onClick={() => {
                    setSearch(h);
                    setSearchFocused(false);
                  }}
                  style={{
                    padding: "7px 12px",
                    cursor: "pointer",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 12,
                    color: t.text2,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: t.text3 }}>🕐</span> {h}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats pills */}
        {matches.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: t.text3,
                background: t.bgCard2,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: "3px 8px",
              }}
            >
              {filteredMatches.length} meciuri
            </span>
            {favorites.length > 0 && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  color: "#ffd23f",
                  background: "rgba(255,210,63,0.08)",
                  border: "1px solid rgba(255,210,63,0.2)",
                  borderRadius: 10,
                  padding: "3px 8px",
                }}
              >
                ⭐ {favorites.length} favorite
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── MAIN ── */}
      <div
        style={{
          flex: 1,
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          padding: "14px 20px 100px",
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}
      >
        {/* Column header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 16px 4px 14px",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              letterSpacing: 2,
              color: t.text4,
            }}
          >
            MECI
          </span>
          <div style={{ display: "flex", gap: 20, width: 86 }}>
            {["1", "X", "2"].map((l) => (
              <span
                key={l}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  letterSpacing: 2,
                  color: t.text4,
                  flex: 1,
                  textAlign: "center" as const,
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* States */}
        {status === "loading" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: "60px 20px",
              color: t.text3,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${t.border}`,
                borderTopColor: t.accent,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Se încarcă meciurile...
          </div>
        )}
        {status === "error" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "60px 20px",
              color: t.text3,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
            }}
          >
            <span style={{ fontSize: 36 }}>⚠️</span>
            <span style={{ color: "#ff2d55" }}>{error}</span>
            <button
              onClick={reload}
              style={{
                border: `1px solid rgba(200,241,53,0.25)`,
                borderRadius: 6,
                color: t.accent,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                padding: "7px 16px",
                cursor: "pointer",
                background: "none",
              }}
            >
              ↻ Încearcă din nou
            </button>
          </div>
        )}
        {status === "idle" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "60px 20px",
              color: t.text3,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
            }}
          >
            <span style={{ fontSize: 36 }}>🔑</span>
            <button
              onClick={() => setShowApiModal(true)}
              style={{
                border: `1px solid rgba(200,241,53,0.25)`,
                borderRadius: 6,
                color: t.accent,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                padding: "7px 16px",
                cursor: "pointer",
                background: "none",
              }}
            >
              CONFIGUREAZĂ API
            </button>
          </div>
        )}
        {status === "success" && filteredMatches.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "60px 20px",
              color: t.text3,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
            }}
          >
            <span style={{ fontSize: 36 }}>🤷</span>
            <span>Niciun meci găsit{search ? ` pentru "${search}"` : ""}</span>
          </div>
        )}
        {status === "success" &&
          filteredMatches.map((match, i) => (
            <MatchRow
              key={match.id}
              match={match}
              animDelay={Math.min(i * 35, 350)}
              sportKey={sport}
              isFavorite={isFav(match.id)}
              onToggleFav={() =>
                toggleFav({
                  match_id: match.id,
                  home_team: match.home_team,
                  away_team: match.away_team,
                  sport_key: sport,
                  commence_time: match.commence_time,
                })
              }
              oddsChange={oddsChanges[match.id]}
            />
          ))}
      </div>

      {/* ── FLOATING BET SLIP ── */}
      <div
        style={{
          position: "fixed",
          top: 64,
          right: 0,
          bottom: 0,
          width: 310,
          zIndex: 200,
          background: t.bgSurface,
          borderLeft: `1px solid ${t.border}`,
          display: "flex",
          flexDirection: "column",
          transform: slipOpen ? "translateX(0)" : "translateX(110%)",
          opacity: slipOpen ? 1 : 0,
          pointerEvents: slipOpen ? "all" : "none",
          transition:
            "transform 0.35s cubic-bezier(0.23,1,0.32,1), opacity 0.35s ease",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Slip header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: `1px solid ${t.border}`,
            flexShrink: 0,
            background: t.accentBg,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 18,
              letterSpacing: 2,
              color: t.text1,
            }}
          >
            🎯 BILET
            <span
              style={{
                background: t.accent,
                color: "#06080c",
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 13,
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selCount}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "flex",
                background: t.bgCard2,
                border: `1px solid ${t.border}`,
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              {(["express", "system"] as BetMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setBetMode(m)}
                  style={{
                    padding: "4px 8px",
                    background: betMode === m ? t.bgCard : "none",
                    border: "none",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    letterSpacing: 1,
                    color: betMode === m ? t.accent : t.text3,
                    cursor: "pointer",
                  }}
                >
                  {m === "express" ? "EXPRESS" : "SISTEM"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSlipOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: t.text3,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Selections */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {!selCount && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: t.text4,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              Selectează cote de pe ecran
            </div>
          )}
          {state.selections.map((sel, i) => (
            <div
              key={sel.id}
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "10px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
                animation: "fadeInUp 0.2s ease both",
                animationDelay: `${i * 40}ms`,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 6 }}
              >
                <span
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: t.text1,
                    flex: 1,
                    lineHeight: 1.3,
                  }}
                >
                  {sel.matchLabel}
                </span>
                <button
                  onClick={() => removeSelection(sel.id)}
                  style={{
                    background: "rgba(255,45,85,0.15)",
                    border: "none",
                    color: "#ff2d55",
                    fontSize: 9,
                    borderRadius: 4,
                    width: 18,
                    height: 18,
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 11,
                    color: t.text2,
                    flex: 1,
                  }}
                >
                  {sel.pick}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    color: t.text3,
                    background: t.bgCard2,
                    padding: "1px 5px",
                    borderRadius: 3,
                  }}
                >
                  {sel.pickLabel}
                </span>
                <span
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 19,
                    color: t.accent,
                  }}
                >
                  {sel.odd.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Slip footer */}
        {selCount > 0 && (
          <div
            style={{
              borderTop: `1px solid ${t.border}`,
              padding: "12px 14px 16px",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 7,
                    letterSpacing: 2,
                    color: t.text3,
                  }}
                >
                  COTE
                </span>
                <span
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 22,
                    color: t.text1,
                  }}
                >
                  {totalOdds.toFixed(2)}×
                </span>
              </div>
              {stakeNum > 0 && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 1 }}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 7,
                      letterSpacing: 2,
                      color: t.text3,
                    }}
                  >
                    {betMode === "system" ? "CÂȘTIG SISTEM" : "CÂȘTIG"}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Bebas Neue', cursive",
                      fontSize: 22,
                      color: t.accent,
                    }}
                  >
                    {systemWin.toFixed(2)} MDL
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[20, 50, 100, 200].map((v) => (
                <button
                  key={v}
                  onClick={() => setStake(String(v))}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    background: stake === String(v) ? t.accentBg : t.bgCard2,
                    border: `1px solid ${stake === String(v) ? t.accent + "44" : t.border}`,
                    borderRadius: 6,
                    color: stake === String(v) ? t.accent : t.text3,
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: t.bgInput,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="Sumă MDL"
                min={1}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  color: t.text1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 15,
                  padding: "10px 12px",
                }}
              />
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: t.text3,
                  padding: "0 10px",
                }}
              >
                MDL
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 7,
                  letterSpacing: 2,
                  color: t.text3,
                }}
              >
                SOLD
              </span>
              <span
                style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 17,
                  color: t.accent,
                }}
              >
                {state.balance.toLocaleString("ro-RO", {
                  minimumFractionDigits: 2,
                })}{" "}
                MDL
              </span>
            </div>
            <button
              onClick={handlePlaceBet}
              disabled={placing || stakeNum < 1}
              style={{
                width: "100%",
                background:
                  placing || stakeNum < 1
                    ? t.bgCard2
                    : `linear-gradient(135deg, ${t.accent}, ${t.accent}cc)`,
                color: placing || stakeNum < 1 ? t.text3 : "#06080c",
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 17,
                letterSpacing: 2,
                padding: "12px 0",
                border: "none",
                borderRadius: 8,
                cursor: placing || stakeNum < 1 ? "default" : "pointer",
                boxShadow: stakeNum > 0 ? `0 4px 16px ${t.accent}33` : "none",
                transition: "all 0.15s",
              }}
            >
              {placing
                ? "⏳ SE PROCESEAZĂ..."
                : `PLASEAZĂ${stakeNum > 0 ? ` — ${stakeNum} MDL` : ""}`}
            </button>
            <button
              onClick={clearSelections}
              style={{
                background: "none",
                border: "none",
                color: t.text3,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                cursor: "pointer",
                textAlign: "center" as const,
              }}
            >
              Golește biletul
            </button>
          </div>
        )}
      </div>

      {/* Floating trigger */}
      {!slipOpen && selCount > 0 && (
        <button
          onClick={() => setSlipOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 90,
            zIndex: 150,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: t.bgCard,
            border: `1px solid ${t.accent}44`,
            borderRadius: 50,
            padding: "10px 18px",
            cursor: "pointer",
            boxShadow: `0 6px 24px rgba(0,0,0,0.4), 0 0 0 1px ${t.accent}22`,
            animation: "fadeInUp 0.3s ease",
          }}
        >
          <span
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 14,
              letterSpacing: 1,
              color: t.text1,
            }}
          >
            🎯 BILET
          </span>
          <span
            style={{
              background: t.accent,
              color: "#06080c",
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 13,
              width: 20,
              height: 20,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {selCount}
          </span>
          <span
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 14,
              color: t.accent,
            }}
          >
            {totalOdds.toFixed(2)}×
          </span>
        </button>
      )}

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
