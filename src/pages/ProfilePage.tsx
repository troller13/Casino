import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/AppStore";
import { getBetHistory, type BetRecord } from "../services/supabase";

export function ProfilePage() {
  const { state, signOut, showToast } = useAppStore();
  const navigate = useNavigate();
  const [history, setHistory] = useState<BetRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!state.user) return;
    setLoadingHistory(true);
    getBetHistory(state.user.id, 30).then((data) => {
      setHistory(data);
      setLoadingHistory(false);
    });
  }, [state.user]);

  async function handleSignOut() {
    await signOut();
    showToast("👋 Deconectat!", "info");
    navigate("/auth");
  }

  if (!state.user) return null;

  const totalBets = history.length;
  const totalWagered = history.reduce((s, b) => s + b.bet_amount, 0);
  const totalWon = history.reduce((s, b) => s + b.win_amount, 0);
  const profit = totalWon - totalWagered;

  const gameIcons: Record<string, string> = {
    sports: "⚽",
    blackjack: "🃏",
    slots: "🎰",
    roulette: "🎡",
    plinko: "🎯",
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header card */}
        <div style={s.profileCard}>
          <div style={s.avatar}>
            {(
              state.profile?.username?.[0] ??
              state.user.email?.[0] ??
              "?"
            ).toUpperCase()}
          </div>
          <div style={s.profileInfo}>
            <div style={s.username}>{state.profile?.username ?? "Jucător"}</div>
            <div style={s.email}>{state.user.email}</div>
            <div style={s.memberSince}>
              Membru din{" "}
              {new Date(state.user.created_at ?? Date.now()).toLocaleDateString(
                "ro-RO",
                { month: "long", year: "numeric" },
              )}
            </div>
          </div>
          <div style={s.balanceBlock}>
            <div style={s.balLbl}>SOLD</div>
            <div style={s.balVal}>
              {state.balance.toLocaleString("ro-RO", {
                minimumFractionDigits: 2,
              })}{" "}
              RON
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={s.statsRow}>
          {[
            {
              label: "PARIURI TOTALE",
              value: String(totalBets),
              color: "#f0f4ff",
            },
            {
              label: "TOTAL PARIAT",
              value: `${totalWagered.toFixed(0)} RON`,
              color: "#ffd23f",
            },
            {
              label: "TOTAL CÂȘTIGAT",
              value: `${totalWon.toFixed(0)} RON`,
              color: "#c8f135",
            },
            {
              label: "PROFIT NET",
              value: `${profit >= 0 ? "+" : ""}${profit.toFixed(0)} RON`,
              color: profit >= 0 ? "#c8f135" : "#ff2d55",
            },
          ].map((stat) => (
            <div key={stat.label} style={s.statCard}>
              <div style={s.statLbl}>{stat.label}</div>
              <div style={{ ...s.statVal, color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bet history */}
        <div style={s.historyCard}>
          <div style={s.sectionTitle}>📋 ISTORIC PARIURI</div>

          {loadingHistory && (
            <div style={s.loading}>
              <div style={s.spinner} /> Se încarcă...
            </div>
          )}

          {!loadingHistory && history.length === 0 && (
            <div style={s.empty}>
              Nu ai pariuri înregistrate încă. Joacă primul tău joc!
            </div>
          )}

          {!loadingHistory &&
            history.map((bet) => {
              const isWin = bet.win_amount > bet.bet_amount;
              const isLoss = bet.win_amount === 0;
              return (
                <div
                  key={bet.id}
                  style={{
                    ...s.betRow,
                    borderLeftColor: isWin
                      ? "#c8f135"
                      : isLoss
                        ? "#ff2d55"
                        : "#ffd23f",
                  }}
                >
                  <div style={s.betGame}>
                    <span style={s.betIcon}>
                      {gameIcons[bet.game_type] ?? "🎲"}
                    </span>
                    <div>
                      <div style={s.betGameName}>
                        {bet.game_type.toUpperCase()}
                      </div>
                      <div style={s.betDate}>
                        {new Date(bet.created_at).toLocaleString("ro-RO", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div style={s.betAmounts}>
                    <div style={s.betWager}>-{bet.bet_amount} RON</div>
                    <div
                      style={{
                        ...s.betWin,
                        color: isWin
                          ? "#c8f135"
                          : isLoss
                            ? "#ff2d55"
                            : "#ffd23f",
                      }}
                    >
                      {isLoss ? "×0" : `+${bet.win_amount} RON`}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        <button onClick={handleSignOut} style={s.btnSignOut}>
          ← DECONECTARE
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "calc(100vh - 100px)",
    padding: "24px",
    background: "transparent",
  },
  container: {
    maxWidth: 860,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  profileCard: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: "28px 32px",
    display: "flex",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap" as const,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #c8f135, #6a8000)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 32,
    color: "#06080c",
    flexShrink: 0,
  },
  profileInfo: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  username: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 28,
    letterSpacing: 2,
    color: "#f0f4ff",
  },
  email: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#8892a4",
  },
  memberSince: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
    letterSpacing: 1,
  },
  balanceBlock: { textAlign: "right" as const },
  balLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
  },
  balVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 30,
    color: "#c8f135",
  },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  statCard: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: "16px 20px",
  },
  statLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    color: "#3d4660",
    marginBottom: 6,
  },
  statVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    letterSpacing: 1,
  },
  historyCard: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 3,
    color: "#3d4660",
    marginBottom: 8,
  },
  loading: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "20px 0",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: "#3d4660",
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid rgba(255,255,255,0.06)",
    borderTopColor: "#c8f135",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  empty: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#3d4660",
    padding: "20px 0",
    textAlign: "center" as const,
  },
  betRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.04)",
    borderLeft: "3px solid",
    borderRadius: 8,
    padding: "12px 16px",
    transition: "background 0.15s",
  },
  betGame: { display: "flex", alignItems: "center", gap: 12 },
  betIcon: { fontSize: 22 },
  betGameName: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 14,
    letterSpacing: 1,
    color: "#f0f4ff",
  },
  betDate: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  betAmounts: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  betWager: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#8892a4",
  },
  betWin: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  btnSignOut: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#3d4660",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
    padding: "12px 20px",
    cursor: "pointer",
    alignSelf: "flex-start",
    transition: "all 0.15s",
  },
};
