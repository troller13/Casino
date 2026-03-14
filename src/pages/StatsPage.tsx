import React, { useEffect, useState } from "react";
import { useAppStore } from "../store/AppStore";
import {
  getBalanceHistory,
  getLeaderboard,
  getUserXP,
  getTournaments,
  joinTournament,
} from "../services/supabase";
import {
  getLevelForXP,
  LEVELS,
  type BalancePoint,
  type LeaderboardEntry,
  type UserXP,
  type Tournament,
} from "../types/index";

type Tab = "stats" | "leaderboard" | "tournaments";

export function StatsPage() {
  const { state, showToast, casinoDeduct } = useAppStore();
  const [tab, setTab] = useState<Tab>("stats");
  const [history, setHistory] = useState<BalancePoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!state.user) return;
    setLoading(true);
    Promise.all([
      getBalanceHistory(state.user.id, 100).then(setHistory),
      getLeaderboard().then(setLeaderboard),
      getUserXP(state.user.id).then(setUserXP),
      getTournaments().then(setTournaments),
    ]).finally(() => setLoading(false));
  }, [state.user]);

  const levelInfo = getLevelForXP(userXP?.xp_total ?? 0);

  async function handleJoinTournament(t: Tournament) {
    if (!state.user || !state.profile) return;
    if (state.balance < t.buy_in) {
      showToast("❌ Sold insuficient pentru buy-in!", "error");
      return;
    }
    setJoiningId(t.id);
    const ok = await casinoDeduct(t.buy_in);
    if (ok) {
      const joined = await joinTournament(
        t.id,
        state.user.id,
        state.profile.username,
        state.balance,
      );
      if (joined) {
        showToast(`🏆 Te-ai înscris la ${t.title}!`, "success");
        getTournaments().then(setTournaments);
      } else {
        showToast("❌ Eroare la înscriere", "error");
      }
    }
    setJoiningId(null);
  }

  // Compute personal stats from sport bets
  const bets = state.sportBets ?? [];
  const wonBets = bets.filter((b) => b.status === "won");
  const lostBets = bets.filter((b) => b.status === "lost");
  const totalStaked = bets.reduce((s, b) => s + Number(b.stake), 0);
  const totalWon = wonBets.reduce((s, b) => s + Number(b.actual_win), 0);
  const profit = totalWon - totalStaked;
  const winRate = bets.length
    ? Math.round(
        (wonBets.length / (wonBets.length + lostBets.length || 1)) * 100,
      )
    : 0;

  // Max streak
  let maxStreak = 0,
    curStreak = 0;
  for (const b of [...bets].sort((a, b2) =>
    a.created_at.localeCompare(b2.created_at),
  )) {
    if (b.status === "won") {
      curStreak++;
      maxStreak = Math.max(maxStreak, curStreak);
    } else curStreak = 0;
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <h1 style={s.title}>📊 STATISTICI & COMUNITATE</h1>
          <div style={s.levelBadge}>
            <span style={{ fontSize: 20 }}>{levelInfo.icon}</span>
            <div>
              <div style={{ ...s.levelName, color: levelInfo.color }}>
                {levelInfo.name}
              </div>
              <div style={s.xpText}>{userXP?.xp_total ?? 0} XP</div>
            </div>
          </div>
        </div>

        {/* XP Progress bar */}
        <div style={s.xpCard}>
          <div style={s.xpHeader}>
            <span style={s.xpLabel}>PROGRES NIVEL</span>
            <span style={{ ...s.xpLabel, color: levelInfo.color }}>
              {levelInfo.progress}%
            </span>
          </div>
          <div style={s.xpTrack}>
            <div
              style={{
                ...s.xpFill,
                width: `${levelInfo.progress}%`,
                background: `linear-gradient(90deg, ${levelInfo.color}88, ${levelInfo.color})`,
              }}
            />
          </div>
          <div style={s.levelRow}>
            {LEVELS.map((l) => (
              <div key={l.level} style={s.levelDot}>
                <div
                  style={{
                    ...s.levelCircle,
                    background:
                      (userXP?.xp_total ?? 0) >= l.minXP ? l.color : "#161b2e",
                    boxShadow:
                      (userXP?.xp_total ?? 0) >= l.minXP
                        ? `0 0 8px ${l.color}88`
                        : "none",
                  }}
                >
                  {l.icon}
                </div>
                <span
                  style={{
                    ...s.levelLabel,
                    color:
                      (userXP?.xp_total ?? 0) >= l.minXP ? l.color : "#252c40",
                  }}
                >
                  {l.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {(["stats", "leaderboard", "tournaments"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ ...s.tab, ...(tab === t ? s.tabOn : {}) }}
            >
              {t === "stats"
                ? "📈 STATISTICI"
                : t === "leaderboard"
                  ? "🏆 CLASAMENT"
                  : "🎯 TURNEE"}
            </button>
          ))}
        </div>

        {loading && (
          <div style={s.loading}>
            <div style={s.spinner} />
          </div>
        )}

        {/* ── STATS TAB ── */}
        {!loading && tab === "stats" && (
          <div style={s.section}>
            {/* KPI cards */}
            <div style={s.kpiGrid}>
              <KpiCard
                label="PARIURI TOTALE"
                value={String(bets.length)}
                color="#f0f4ff"
              />
              <KpiCard
                label="CÂȘTIGATE"
                value={String(wonBets.length)}
                color="#c8f135"
              />
              <KpiCard
                label="PIERDUTE"
                value={String(lostBets.length)}
                color="#ff2d55"
              />
              <KpiCard
                label="RATA CÂȘTIG"
                value={`${winRate}%`}
                color="#00e5ff"
              />
              <KpiCard
                label="TOTAL PARIAT"
                value={`${totalStaked.toFixed(0)} MDL`}
                color="#ffd23f"
              />
              <KpiCard
                label="PROFIT NET"
                value={`${profit >= 0 ? "+" : ""}${profit.toFixed(0)} MDL`}
                color={profit >= 0 ? "#c8f135" : "#ff2d55"}
              />
              <KpiCard
                label="STREAK MAX"
                value={`${maxStreak} victorii`}
                color="#ff6b2b"
              />
              <KpiCard
                label="SOLD CURENT"
                value={`${state.balance.toFixed(0)} MDL`}
                color="#c8f135"
              />
            </div>

            {/* Balance chart */}
            <div style={s.chartCard}>
              <div style={s.chartTitle}>📈 EVOLUȚIE SOLD</div>
              {history.length < 2 ? (
                <div style={s.noData}>
                  Plasează pariuri pentru a vedea graficul soldului
                </div>
              ) : (
                <BalanceChart points={history} />
              )}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {!loading && tab === "leaderboard" && (
          <div style={s.section}>
            <div style={s.leaderHeader}>
              <span style={s.leaderTitle}>
                TOP JUCĂTORI — ACEASTĂ SĂPTĂMÂNĂ
              </span>
              <span style={s.leaderSub}>Resetare lunea viitoare</span>
            </div>
            {leaderboard.length === 0 ? (
              <div style={s.noData}>
                Niciun pariu această săptămână. Fii primul!
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <LeaderRow
                  key={entry.id}
                  entry={entry}
                  rank={i + 1}
                  isMe={entry.user_id === state.user?.id}
                />
              ))
            )}
            {/* My position */}
            {!leaderboard.some((e) => e.user_id === state.user?.id) &&
              state.profile && (
                <div style={s.myPosition}>
                  Tu nu ești în top 20 această săptămână. Plasează pariuri
                  pentru a urca!
                </div>
              )}
          </div>
        )}

        {/* ── TOURNAMENTS TAB ── */}
        {!loading && tab === "tournaments" && (
          <div style={s.section}>
            {tournaments.length === 0 ? (
              <div style={s.noData}>Nu există turnee disponibile momentan.</div>
            ) : (
              tournaments.map((t) => {
                const isJoined = t.entries?.some(
                  (e) => e.user_id === state.user?.id,
                );
                const myEntry = t.entries?.find(
                  (e) => e.user_id === state.user?.id,
                );
                const playerCount = t.entries?.length ?? 0;
                return (
                  <div key={t.id} style={s.tournamentCard}>
                    <div style={s.tHeader}>
                      <div>
                        <div style={s.tTitle}>{t.title}</div>
                        <div style={s.tDesc}>{t.description}</div>
                      </div>
                      <div
                        style={{
                          ...s.tStatusBadge,
                          background:
                            t.status === "active"
                              ? "rgba(200,241,53,0.1)"
                              : t.status === "upcoming"
                                ? "rgba(0,229,255,0.1)"
                                : "rgba(255,255,255,0.05)",
                          color:
                            t.status === "active"
                              ? "#c8f135"
                              : t.status === "upcoming"
                                ? "#00e5ff"
                                : "#3d4660",
                        }}
                      >
                        {t.status === "active"
                          ? "🔴 LIVE"
                          : t.status === "upcoming"
                            ? "⏳ URMĂTOR"
                            : "✅ FINALIZAT"}
                      </div>
                    </div>
                    <div style={s.tStats}>
                      <div style={s.tStat}>
                        <span style={s.tStatLbl}>BUY-IN</span>
                        <span style={s.tStatVal}>{t.buy_in} MDL</span>
                      </div>
                      <div style={s.tStat}>
                        <span style={s.tStatLbl}>PRIZE POOL</span>
                        <span style={{ ...s.tStatVal, color: "#ffd23f" }}>
                          {(t.prize_pool || t.buy_in * playerCount).toFixed(0)}{" "}
                          MDL
                        </span>
                      </div>
                      <div style={s.tStat}>
                        <span style={s.tStatLbl}>JUCĂTORI</span>
                        <span style={s.tStatVal}>
                          {playerCount}/{t.max_players}
                        </span>
                      </div>
                      <div style={s.tStat}>
                        <span style={s.tStatLbl}>PERIOADĂ</span>
                        <span style={s.tStatVal}>
                          {new Date(t.starts_at).toLocaleDateString("ro-RO", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                          {" → "}
                          {new Date(t.ends_at).toLocaleDateString("ro-RO", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {myEntry && (
                      <div style={s.myEntryRow}>
                        <span style={s.myEntryLbl}>PROFIT TĂU</span>
                        <span
                          style={{
                            ...s.myEntryVal,
                            color: myEntry.profit >= 0 ? "#c8f135" : "#ff2d55",
                          }}
                        >
                          {myEntry.profit >= 0 ? "+" : ""}
                          {Number(myEntry.profit).toFixed(2)} MDL
                        </span>
                        {myEntry.rank && (
                          <span style={s.myEntryRank}>#{myEntry.rank}</span>
                        )}
                      </div>
                    )}
                    {!isJoined && t.status !== "finished" && (
                      <button
                        onClick={() => handleJoinTournament(t)}
                        disabled={joiningId === t.id}
                        style={{
                          ...s.btnJoin,
                          opacity: joiningId === t.id ? 0.6 : 1,
                        }}
                      >
                        {joiningId === t.id
                          ? "⏳ SE ÎNSCRIE..."
                          : `🏆 ÎNSCRIE-TE — ${t.buy_in} MDL`}
                      </button>
                    )}
                    {isJoined && <div style={s.joinedBadge}>✅ ÎNSCRIS</div>}
                    {/* Mini leaderboard */}
                    {(t.entries?.length ?? 0) > 0 && (
                      <div style={s.miniLeader}>
                        {[...(t.entries ?? [])]
                          .sort((a, b) => Number(b.profit) - Number(a.profit))
                          .slice(0, 5)
                          .map((e, i) => (
                            <div
                              key={e.id}
                              style={{
                                ...s.miniRow,
                                background:
                                  e.user_id === state.user?.id
                                    ? "rgba(200,241,53,0.06)"
                                    : "transparent",
                              }}
                            >
                              <span style={s.miniRank}>
                                {["🥇", "🥈", "🥉", "4", "5"][i]}
                              </span>
                              <span style={s.miniName}>{e.username}</span>
                              <span
                                style={{
                                  ...s.miniProfit,
                                  color:
                                    Number(e.profit) >= 0
                                      ? "#c8f135"
                                      : "#ff2d55",
                                }}
                              >
                                {Number(e.profit) >= 0 ? "+" : ""}
                                {Number(e.profit).toFixed(0)} MDL
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Balance Chart (SVG inline) ────────────────────────────────────────────────
function BalanceChart({ points }: { points: BalancePoint[] }) {
  if (points.length < 2) return null;
  const W = 600,
    H = 180,
    PAD = 40;
  const values = points.map((p) => Number(p.balance));
  const min = Math.min(...values),
    max = Math.max(...values);
  const range = max - min || 1;

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => PAD + (1 - (v - min) / range) * (H - PAD * 2);

  const pathD = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(Number(p.balance)).toFixed(1)}`,
    )
    .join(" ");
  const fillD =
    pathD + ` L${toX(points.length - 1)},${H - PAD} L${toX(0)},${H - PAD} Z`;

  const isProfit =
    Number(points[points.length - 1].balance) >= Number(points[0].balance);
  const color = isProfit ? "#c8f135" : "#ff2d55";

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD}
          y1={PAD + f * (H - PAD * 2)}
          x2={W - PAD}
          y2={PAD + f * (H - PAD * 2)}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      ))}
      {/* Fill */}
      <path d={fillD} fill="url(#chartFill)" />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Start dot */}
      <circle
        cx={toX(0)}
        cy={toY(values[0])}
        r="4"
        fill={color}
        opacity="0.8"
      />
      {/* End dot */}
      <circle
        cx={toX(points.length - 1)}
        cy={toY(values[points.length - 1])}
        r="5"
        fill={color}
        stroke="#0d1017"
        strokeWidth="2"
      />
      {/* Labels */}
      <text
        x={PAD}
        y={H - 8}
        fontFamily="'JetBrains Mono'"
        fontSize="9"
        fill="rgba(255,255,255,0.2)"
      >
        {new Date(points[0].created_at).toLocaleDateString("ro-RO", {
          day: "2-digit",
          month: "2-digit",
        })}
      </text>
      <text
        x={W - PAD}
        y={H - 8}
        textAnchor="end"
        fontFamily="'JetBrains Mono'"
        fontSize="9"
        fill="rgba(255,255,255,0.2)"
      >
        {new Date(points[points.length - 1].created_at).toLocaleDateString(
          "ro-RO",
          { day: "2-digit", month: "2-digit" },
        )}
      </text>
      <text
        x={W - PAD}
        y={toY(values[values.length - 1]) - 8}
        textAnchor="end"
        fontFamily="'Bebas Neue'"
        fontSize="14"
        fill={color}
      >
        {values[values.length - 1].toFixed(0)} MDL
      </text>
    </svg>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={kc.card}>
      <div style={kc.label}>{label}</div>
      <div style={{ ...kc.value, color }}>{value}</div>
    </div>
  );
}

// ─── Leaderboard Row ───────────────────────────────────────────────────────────
function LeaderRow({
  entry,
  rank,
  isMe,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isMe: boolean;
}) {
  const medal =
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  return (
    <div
      style={{
        ...lr.row,
        background: isMe ? "rgba(200,241,53,0.06)" : "#111520",
        borderColor: isMe ? "rgba(200,241,53,0.2)" : "rgba(255,255,255,0.05)",
      }}
    >
      <span style={lr.rank}>{medal}</span>
      <div style={lr.info}>
        <span style={{ ...lr.name, color: isMe ? "#c8f135" : "#f0f4ff" }}>
          {entry.username}
          {isMe ? " (Tu)" : ""}
        </span>
        <span style={lr.meta}>
          {entry.wins} victorii · {entry.total_bets} pariuri · {entry.win_rate}%
          rată
        </span>
      </div>
      <div style={lr.right}>
        <span
          style={{
            ...lr.profit,
            color: Number(entry.profit) >= 0 ? "#c8f135" : "#ff2d55",
          }}
        >
          {Number(entry.profit) >= 0 ? "+" : ""}
          {Number(entry.profit).toFixed(0)} MDL
        </span>
        <span style={lr.xp}>{entry.xp} XP</span>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 100px)",
    padding: "24px",
    background: "transparent",
  },
  container: {
    maxWidth: 960,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: 12,
  },
  title: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 36,
    letterSpacing: 3,
    color: "#f0f4ff",
  },
  levelBadge: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: "10px 16px",
  },
  levelName: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    letterSpacing: 2,
  },
  xpText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  xpCard: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  xpHeader: { display: "flex", justifyContent: "space-between" },
  xpLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 3,
    color: "#3d4660",
  },
  xpTrack: {
    height: 8,
    background: "#161b2e",
    borderRadius: 4,
    overflow: "hidden",
  },
  xpFill: { height: "100%", borderRadius: 4, transition: "width 1s ease" },
  levelRow: { display: "flex", justifyContent: "space-between" },
  levelDot: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  levelCircle: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    transition: "all 0.3s",
  },
  levelLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 7,
    letterSpacing: 1,
    textAlign: "center" as const,
  },
  tabs: { display: "flex", gap: 6 },
  tab: {
    flex: 1,
    padding: "10px",
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8,
    color: "#3d4660",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: 1,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabOn: {
    borderColor: "rgba(200,241,53,0.25)",
    color: "#c8f135",
    background: "rgba(200,241,53,0.06)",
  },
  loading: { display: "flex", justifyContent: "center", padding: "40px" },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(255,255,255,0.06)",
    borderTopColor: "#c8f135",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  section: { display: "flex", flexDirection: "column", gap: 12 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  chartCard: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: "20px 24px",
  },
  chartTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 3,
    color: "#3d4660",
    marginBottom: 16,
  },
  noData: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#252c40",
    textAlign: "center" as const,
    padding: "30px 0",
  },
  leaderHeader: { display: "flex", alignItems: "baseline", gap: 12 },
  leaderTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    letterSpacing: 2,
    color: "#f0f4ff",
  },
  leaderSub: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  myPosition: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#3d4660",
    textAlign: "center" as const,
    padding: "12px",
    background: "#0d1017",
    borderRadius: 8,
  },
  tournamentCard: {
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  tHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  tTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    letterSpacing: 2,
    color: "#f0f4ff",
  },
  tDesc: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    color: "#8892a4",
    marginTop: 4,
  },
  tStatusBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    padding: "4px 10px",
    borderRadius: 20,
    flexShrink: 0,
  },
  tStats: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  tStat: { display: "flex", flexDirection: "column", gap: 3 },
  tStatLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 7,
    letterSpacing: 2,
    color: "#3d4660",
  },
  tStatVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    color: "#f0f4ff",
  },
  myEntryRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    background: "rgba(200,241,53,0.06)",
    borderRadius: 8,
    border: "1px solid rgba(200,241,53,0.1)",
  },
  myEntryLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
    flex: 1,
  },
  myEntryVal: { fontFamily: "'Bebas Neue', cursive", fontSize: 22 },
  myEntryRank: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 28,
    color: "#ffd23f",
  },
  btnJoin: {
    background: "linear-gradient(135deg, #ffd23f, #cc9900)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    letterSpacing: 2,
    padding: "12px 0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    width: "100%",
    transition: "all 0.15s",
  },
  joinedBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#c8f135",
    textAlign: "center" as const,
    padding: "8px",
    background: "rgba(200,241,53,0.06)",
    borderRadius: 6,
    border: "1px solid rgba(200,241,53,0.15)",
  },
  miniLeader: {
    borderTop: "1px solid rgba(255,255,255,0.04)",
    paddingTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  miniRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "5px 8px",
    borderRadius: 6,
  },
  miniRank: { fontSize: 14, width: 20, textAlign: "center" as const },
  miniName: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: "#8892a4",
    flex: 1,
  },
  miniProfit: { fontFamily: "'Bebas Neue', cursive", fontSize: 16 },
};

const kc: Record<string, React.CSSProperties> = {
  card: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: "16px 18px",
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 7,
    letterSpacing: 2,
    color: "#3d4660",
    marginBottom: 6,
  },
  value: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    letterSpacing: 1,
  },
};

const lr: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1px solid",
    borderRadius: 10,
    padding: "12px 16px",
    transition: "background 0.15s",
  },
  rank: {
    fontSize: 22,
    width: 30,
    textAlign: "center" as const,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },
  name: { fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700 },
  meta: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  right: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
  },
  profit: { fontFamily: "'Bebas Neue', cursive", fontSize: 20 },
  xp: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
};
