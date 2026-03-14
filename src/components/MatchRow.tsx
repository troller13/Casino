import React, { useState, useEffect } from "react";
import { extractOdds } from "../services/api";
import { useAppStore } from "../store/AppStore";
import { useThemedStyles } from "../store/ThemeContext";
import { triggerQuickBet } from "./QuickBet";
import { LiveChat } from "./LiveChat";
import { supabase, IS_SUPABASE_CONFIGURED } from "../services/supabase";
import type { Match, PickLabel } from "../types/index.ts";

interface Props {
  match: Match;
  animDelay?: number;
  sportKey: string;
  isFavorite?: boolean;
  onToggleFav?: () => void;
  oddsChange?: {
    home?: "up" | "down";
    away?: "up" | "down";
    draw?: "up" | "down";
  };
}

function randomForm() {
  return Array.from(
    { length: 5 },
    () => ["W", "L", "D"][Math.floor(Math.random() * 3)],
  );
}

export function MatchRow({
  match,
  animDelay = 0,
  sportKey,
  isFavorite = false,
  onToggleFav,
  oddsChange,
}: Props) {
  const { state, toggleSelection, showToast } = useAppStore();
  const t = useThemedStyles();
  const [expanded, setExpanded] = useState(false);
  const [showComparator, setShowComparator] = useState(false);
  const [homeForm] = useState(randomForm);
  const [awayForm] = useState(randomForm);
  const [socialCount, setSocialCount] = useState(0);
  const odds = extractOdds(match);

  // Fetch social bet count for this match
  useEffect(() => {
    if (!IS_SUPABASE_CONFIGURED) return;
    supabase
      .from("social_bets")
      .select("id", { count: "exact", head: true })
      .eq("match_id", match.id)
      .eq("status", "pending")
      .then(({ count }) => setSocialCount(count ?? 0));
  }, [match.id]);

  const isSelected = (label: PickLabel) =>
    state.selections.some((s) => s.id === `${match.id}_${label}`);

  const handlePick = (label: PickLabel, pick: string, odd: number | null) => {
    if (!odd) return;
    const id = `${match.id}_${label}`;
    const wasSelected = state.selections.some((s) => s.id === id);
    toggleSelection({
      id,
      matchId: match.id,
      matchLabel: `${match.home_team} vs ${match.away_team}`,
      pick,
      pickLabel: label,
      odd,
    });
    if (!wasSelected) showToast(`✅ ${pick} adăugat`, "success");
  };

  const date = new Date(match.commence_time);
  const isLive = date <= new Date();
  const dateStr = date.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
  });
  const timeStr = date.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const anySelected = isSelected("1") || isSelected("X") || isSelected("2");

  // Best odds across bookmakers for comparator
  const bookmakers = match.bookmakers ?? [];

  return (
    <div
      style={{
        ...s.card,
        borderColor: anySelected
          ? "rgba(200,241,53,0.35)"
          : isFavorite
            ? "rgba(255,210,63,0.25)"
            : t.border,
        background: anySelected
          ? `linear-gradient(135deg, rgba(200,241,53,0.04), ${t.bgCard})`
          : t.bgCard,
        animationDelay: `${animDelay}ms`,
      }}
    >
      {/* Live badge */}
      {isLive && (
        <div style={s.liveBadge}>
          <span style={s.liveDot} /> LIVE
        </div>
      )}

      {/* Social badge */}
      {socialCount > 0 && (
        <div style={s.socialBadge}>🔥 {socialCount} pariuri active</div>
      )}

      {/* Main row */}
      <div style={s.mainRow}>
        {/* Teams */}
        <div style={s.teamsBlock} onClick={() => setExpanded((e) => !e)}>
          <div style={s.teamRow}>
            <span style={s.teamEmoji}>🏠</span>
            <span style={{ ...s.teamName, color: t.text1 }}>
              {match.home_team}
            </span>
            {homeForm.map((r, i) => (
              <span
                key={i}
                style={{
                  ...s.formDot,
                  background:
                    r === "W" ? "#c8f135" : r === "L" ? "#ff2d55" : "#ffd23f",
                  opacity: 1 - i * 0.15,
                }}
              />
            ))}
          </div>
          <div style={s.vsDivider}>
            <span style={{ ...s.vsText, color: t.text4 }}>VS</span>
            <span
              style={{ ...s.matchTime, color: isLive ? "#ff2d55" : t.text3 }}
            >
              {isLive ? "⚡ LIVE" : `${dateStr} ${timeStr}`}
            </span>
          </div>
          <div style={s.teamRow}>
            <span style={s.teamEmoji}>✈️</span>
            <span style={{ ...s.teamName, color: t.text1 }}>
              {match.away_team}
            </span>
            {awayForm.map((r, i) => (
              <span
                key={i}
                style={{
                  ...s.formDot,
                  background:
                    r === "W" ? "#c8f135" : r === "L" ? "#ff2d55" : "#ffd23f",
                  opacity: 1 - i * 0.15,
                }}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div style={s.actionRow}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFav?.();
              }}
              style={s.favBtn}
              title="Favorite"
            >
              {isFavorite ? "⭐" : "☆"}
            </button>
            {bookmakers.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowComparator((c) => !c);
                }}
                style={{
                  ...s.favBtn,
                  color: showComparator ? "#00e5ff" : t.text3,
                }}
                title="Compară cote"
              >
                📊
              </button>
            )}
            <span style={{ ...s.expandArrow, color: t.text3 }}>
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </div>

        {/* Odds column */}
        <div style={{ ...s.oddsBlock, borderLeftColor: t.border2 }}>
          {[
            {
              label: "1" as PickLabel,
              pick: match.home_team,
              odd: odds.home,
              change: oddsChange?.home,
            },
            {
              label: "X" as PickLabel,
              pick: "Egal",
              odd: odds.draw,
              change: oddsChange?.draw,
            },
            {
              label: "2" as PickLabel,
              pick: match.away_team,
              odd: odds.away,
              change: oddsChange?.away,
            },
          ].map(({ label, pick, odd, change }) =>
            odd ? (
              <button
                key={label}
                onClick={() => handlePick(label, pick, odd)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  triggerQuickBet({
                    x: e.clientX,
                    y: e.clientY,
                    selection: {
                      id: `${match.id}_${label}`,
                      matchId: match.id,
                      matchLabel: `${match.home_team} vs ${match.away_team}`,
                      pick,
                      pickLabel: label,
                      odd,
                    },
                    matchData: {
                      homeTeam: match.home_team,
                      awayTeam: match.away_team,
                      commenceTime: match.commence_time,
                      sportKey,
                    },
                  });
                }}
                title="Click dreapta → Pariu rapid"
                style={{
                  ...s.oddBtn,
                  ...(isSelected(label) ? s.oddBtnOn : {}),
                  borderBottomColor: t.border2,
                }}
              >
                <span style={{ ...s.oddLabel, color: t.text3 }}>{label}</span>
                <span
                  style={{
                    ...s.oddVal,
                    color: isSelected(label) ? "#c8f135" : t.text1,
                  }}
                >
                  {odd.toFixed(2)}
                </span>
                {/* Odds change arrow */}
                {change && (
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: 4,
                      fontSize: 10,
                      color: change === "up" ? "#c8f135" : "#ff2d55",
                      animation: "fadeInUp 0.3s ease",
                    }}
                  >
                    {change === "up" ? "▲" : "▼"}
                  </span>
                )}
                {isSelected(label) && <span style={s.checkmark}>✓</span>}
              </button>
            ) : (
              <div
                key={label}
                style={{
                  ...s.oddNA,
                  borderBottomColor: t.border2,
                  color: t.text4,
                }}
              >
                —
              </div>
            ),
          )}
        </div>
      </div>

      {/* Odds comparator */}
      {showComparator && bookmakers.length > 1 && (
        <div
          style={{
            ...s.comparator,
            background: t.bgSurface,
            borderTopColor: t.border2,
          }}
        >
          <div style={{ ...s.comparatorTitle, color: t.text3 }}>
            📊 COMPARATOR COTE — {bookmakers.length} bookmaker-i
          </div>
          <div style={s.comparatorGrid}>
            <div style={{ ...s.compHeader, color: t.text3 }}>Bookmaker</div>
            <div style={{ ...s.compHeader, color: t.text3 }}>1</div>
            <div style={{ ...s.compHeader, color: t.text3 }}>X</div>
            <div style={{ ...s.compHeader, color: t.text3 }}>2</div>
            {bookmakers.slice(0, 6).map((bk) => {
              const market = bk.markets?.find((m) => m.key === "h2h");
              if (!market) return null;
              const h = market.outcomes.find(
                (o) => o.name === match.home_team,
              )?.price;
              const d = market.outcomes.find((o) => o.name === "Draw")?.price;
              const a = market.outcomes.find(
                (o) => o.name === match.away_team,
              )?.price;
              // Find best odds across all bookmakers
              const bestH = Math.max(
                ...bookmakers.map(
                  (b) =>
                    b.markets
                      ?.find((m) => m.key === "h2h")
                      ?.outcomes.find((o) => o.name === match.home_team)
                      ?.price ?? 0,
                ),
              );
              const bestA = Math.max(
                ...bookmakers.map(
                  (b) =>
                    b.markets
                      ?.find((m) => m.key === "h2h")
                      ?.outcomes.find((o) => o.name === match.away_team)
                      ?.price ?? 0,
                ),
              );
              const bestD = Math.max(
                ...bookmakers.map(
                  (b) =>
                    b.markets
                      ?.find((m) => m.key === "h2h")
                      ?.outcomes.find((o) => o.name === "Draw")?.price ?? 0,
                ),
              );
              return (
                <React.Fragment key={bk.key}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: t.text2,
                      padding: "5px 0",
                    }}
                  >
                    {bk.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', cursive",
                      fontSize: 16,
                      color: h === bestH ? "#c8f135" : t.text1,
                      textAlign: "center",
                    }}
                  >
                    {h?.toFixed(2) ?? "—"}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', cursive",
                      fontSize: 16,
                      color: d === bestD ? "#c8f135" : t.text1,
                      textAlign: "center",
                    }}
                  >
                    {d?.toFixed(2) ?? "—"}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', cursive",
                      fontSize: 16,
                      color: a === bestA ? "#c8f135" : t.text1,
                      textAlign: "center",
                    }}
                  >
                    {a?.toFixed(2) ?? "—"}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              color: t.text3,
              marginTop: 6,
            }}
          >
            🟢 = Cea mai bună cotă disponibilă
          </div>
        </div>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            ...s.expandedPanel,
            background: t.bgSurface,
            borderTopColor: t.border2,
          }}
        >
          <div style={s.expandedGrid}>
            {/* Stats */}
            <div style={s.statBox}>
              <div style={{ ...s.statTitle, color: t.text3 }}>
                📊 STATISTICI SIMULATE
              </div>
              <StatBar
                label="Posesie"
                home={55 + Math.floor(Math.random() * 20)}
                away={25 + Math.floor(Math.random() * 20)}
                t={t}
              />
              <StatBar
                label="Șuturi"
                home={3 + Math.floor(Math.random() * 8)}
                away={2 + Math.floor(Math.random() * 8)}
                t={t}
              />
              <StatBar
                label="Cornere"
                home={1 + Math.floor(Math.random() * 6)}
                away={1 + Math.floor(Math.random() * 6)}
                t={t}
              />
              <StatBar
                label="Formă"
                home={40 + Math.floor(Math.random() * 50)}
                away={40 + Math.floor(Math.random() * 50)}
                t={t}
              />
            </div>
            {/* Extra markets */}
            <div style={s.marketsBox}>
              <div style={{ ...s.statTitle, color: t.text3 }}>
                🎯 PIEȚE EXTRA
              </div>
              <div style={s.extraMarkets}>
                {[
                  {
                    label: "Peste 2.5 goluri",
                    odd: (1.6 + Math.random() * 0.4).toFixed(2),
                  },
                  {
                    label: "Sub 2.5 goluri",
                    odd: (2.0 + Math.random() * 0.4).toFixed(2),
                  },
                  {
                    label: "Ambele marchează",
                    odd: (1.8 + Math.random() * 0.4).toFixed(2),
                  },
                  {
                    label: "Gol în prima repriză",
                    odd: (1.5 + Math.random() * 0.5).toFixed(2),
                  },
                ].map((m) => (
                  <div
                    key={m.label}
                    style={{
                      ...s.extraRow,
                      background: t.bgCard,
                      borderColor: t.border,
                    }}
                  >
                    <span style={{ ...s.extraLabel, color: t.text2 }}>
                      {m.label}
                    </span>
                    <button
                      style={{
                        ...s.extraOdd,
                        background: t.bgCard2,
                        borderColor: t.border,
                        color: t.text1,
                      }}
                    >
                      {m.odd}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Chat */}
          <div style={{ marginTop: 14 }}>
            <LiveChat
              roomId={`match_${match.id}`}
              roomLabel={`💬 ${match.home_team} vs ${match.away_team}`}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatBar({
  label,
  home,
  away,
  t,
}: {
  label: string;
  home: number;
  away: number;
  t: ReturnType<typeof useThemedStyles>;
}) {
  const total = home + away || 1;
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: t.text3,
          width: 50,
        }}
      >
        {home}
      </span>
      <div
        style={{
          flex: 1,
          height: 5,
          background: t.bgCard2,
          borderRadius: 3,
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          style={{
            width: `${(home / total) * 100}%`,
            background: "#c8f135",
            transition: "width 0.5s",
          }}
        />
        <div
          style={{
            width: `${(away / total) * 100}%`,
            background: "#3d4660",
            transition: "width 0.5s",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8,
          color: t.text3,
          width: 50,
          textAlign: "center" as const,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: t.text3,
          width: 25,
          textAlign: "right" as const,
        }}
      >
        {away}
      </span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 12,
    overflow: "hidden",
    transition: "all 0.2s ease",
    animation: "fadeInUp 0.35s ease both",
    position: "relative",
  },
  liveBadge: {
    position: "absolute",
    top: 8,
    right: 44,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(255,45,85,0.15)",
    border: "1px solid rgba(255,45,85,0.4)",
    borderRadius: 20,
    padding: "2px 8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#ff2d55",
    letterSpacing: 2,
    fontWeight: 700,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#ff2d55",
    boxShadow: "0 0 6px #ff2d55",
    animation: "pulse 1s ease-in-out infinite",
    display: "inline-block",
  },
  socialBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    color: "#ff6b2b",
    background: "rgba(255,107,43,0.12)",
    border: "1px solid rgba(255,107,43,0.25)",
    borderRadius: 10,
    padding: "2px 8px",
  },
  mainRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "stretch",
  },
  teamsBlock: {
    padding: "14px 16px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    position: "relative",
  },
  teamRow: { display: "flex", alignItems: "center", gap: 6 },
  teamEmoji: { fontSize: 12, width: 16, textAlign: "center", flexShrink: 0 },
  teamName: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  formDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  vsDivider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingLeft: 22,
  },
  vsText: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 10,
    letterSpacing: 2,
  },
  matchTime: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9 },
  actionRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 4 },
  favBtn: {
    background: "none",
    border: "none",
    fontSize: 14,
    cursor: "pointer",
    padding: "2px 4px",
  },
  expandArrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    marginLeft: "auto",
  },
  oddsBlock: {
    display: "flex",
    flexDirection: "column",
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    width: 80,
  },
  oddBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    background: "transparent",
    border: "none",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    cursor: "pointer",
    transition: "all 0.15s ease",
    padding: "8px 4px",
    position: "relative",
  },
  oddBtnOn: {
    background: "rgba(200,241,53,0.1)",
    boxShadow: "inset 3px 0 0 #c8f135",
  },
  oddLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 1,
  },
  oddVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 19,
    letterSpacing: 0.5,
    transition: "color 0.15s",
  },
  checkmark: {
    position: "absolute",
    top: 3,
    right: 4,
    fontSize: 9,
    color: "#c8f135",
  },
  oddNA: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
  },
  comparator: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    padding: "12px 16px",
  },
  comparatorTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    marginBottom: 10,
  },
  comparatorGrid: {
    display: "grid",
    gridTemplateColumns: "140px repeat(3, 1fr)",
    gap: "4px 8px",
    alignItems: "center",
  },
  compHeader: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    textAlign: "center" as const,
    paddingBottom: 4,
  },
  expandedPanel: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    padding: "14px 16px",
    animation: "fadeInUp 0.25s ease",
  },
  expandedGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  statBox: { display: "flex", flexDirection: "column", gap: 6 },
  statTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    marginBottom: 4,
  },
  marketsBox: { display: "flex", flexDirection: "column", gap: 6 },
  extraMarkets: { display: "flex", flexDirection: "column", gap: 5 },
  extraRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 10px",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
  },
  extraLabel: { fontFamily: "'Syne', sans-serif", fontSize: 11 },
  extraOdd: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 5,
    padding: "3px 10px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
};
