import React, { useEffect, useState } from "react";
import { useAppStore } from "../store/AppStore";
import { requestCashout } from "../services/supabase";
import type { SportBet } from "../types/index.ts";

const STATUS_CONFIG = {
  pending: {
    label: "ÎN AȘTEPTARE",
    color: "#ffd23f",
    bg: "rgba(255,210,63,0.1)",
    border: "rgba(255,210,63,0.3)",
  },
  won: {
    label: "CÂȘTIGAT",
    color: "#c8f135",
    bg: "rgba(200,241,53,0.1)",
    border: "rgba(200,241,53,0.3)",
  },
  lost: {
    label: "PIERDUT",
    color: "#ff2d55",
    bg: "rgba(255,45,85,0.1)",
    border: "rgba(255,45,85,0.3)",
  },
  void: {
    label: "ANULAT",
    color: "#8892a4",
    bg: "rgba(136,146,164,0.1)",
    border: "rgba(136,146,164,0.3)",
  },
};

export function MyBetsPage() {
  const { state, loadSportBets, checkResults, showToast } = useAppStore();
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "won" | "lost">(
    "all",
  );
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setDebugInfo("Se încarcă...");
    loadSportBets()
      .then(() => {
        setLoading(false);
        setDebugInfo("");
      })
      .catch((err) => {
        setLoading(false);
        setDebugInfo(`Eroare: ${err?.message ?? "necunoscută"}`);
      });
  }, [loadSportBets]);

  async function handleCheckResults() {
    setChecking(true);
    const { settled, won } = await checkResults();
    if (settled === 0) {
      showToast("ℹ️ Niciun meci finalizat găsit.", "info");
    } else if (won > 0) {
      showToast(
        `🏆 ${settled} pariu(ri) verificate · +${won.toFixed(2)} MDL câștigat!`,
        "success",
      );
    } else {
      showToast(
        `✅ ${settled} pariu(ri) verificate · Niciun câștig de această dată.`,
        "info",
      );
    }
    await loadSportBets();
    setChecking(false);
  }

  const filtered = (state.sportBets ?? []).filter((b) =>
    filter === "all" ? true : b.status === filter,
  );

  const pendingCount = (state.sportBets ?? []).filter(
    (b) => b.status === "pending",
  ).length;
  const totalWon = (state.sportBets ?? [])
    .filter((b) => b.status === "won")
    .reduce((s, b) => s + b.actual_win, 0);
  const totalStaked = (state.sportBets ?? []).reduce((s, b) => s + b.stake, 0);

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>⚽ PARIURILE MELE</h1>
            <p style={s.subtitle}>Istoric complet și verificare rezultate</p>
          </div>
          <button
            onClick={handleCheckResults}
            disabled={checking || pendingCount === 0}
            style={{
              ...s.btnCheck,
              opacity: checking || pendingCount === 0 ? 0.5 : 1,
            }}
          >
            {checking ? (
              <>⏳ SE VERIFICĂ...</>
            ) : (
              <>
                🔄 VERIFICĂ REZULTATE {pendingCount > 0 && `(${pendingCount})`}
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <StatCard
            label="TOTAL PARIURI"
            value={String(state.sportBets?.length ?? 0)}
            color="#f0f4ff"
          />
          <StatCard
            label="ÎN AȘTEPTARE"
            value={String(pendingCount)}
            color="#ffd23f"
          />
          <StatCard
            label="TOTAL CÂȘTIGAT"
            value={`${totalWon.toFixed(2)} MDL`}
            color="#c8f135"
          />
          <StatCard
            label="TOTAL PARIAT"
            value={`${totalStaked.toFixed(2)} MDL`}
            color="#8892a4"
          />
        </div>

        {/* Filter tabs */}
        <div style={s.filters}>
          {(["all", "pending", "won", "lost"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...s.filterBtn,
                ...(filter === f ? s.filterBtnActive : {}),
              }}
            >
              {f === "all" ? "TOATE" : STATUS_CONFIG[f].label}
            </button>
          ))}
        </div>

        {/* Bets list */}
        {loading ? (
          <div style={s.empty}>
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid rgba(255,255,255,0.06)",
                borderTopColor: "#c8f135",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p>Se încarcă pariurile...</p>
          </div>
        ) : debugInfo ? (
          <div style={{ ...s.empty, color: "#ff2d55" }}>
            <span style={{ fontSize: 30 }}>⚠️</span>
            <p>{debugInfo}</p>
            <p style={{ fontSize: 10, color: "#3d4660", marginTop: 4 }}>
              Verifică consola browser-ului (F12) pentru detalii
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <span style={{ fontSize: 40 }}>🎯</span>
            <p>
              {filter === "pending"
                ? "Nu ai pariuri în așteptare."
                : filter === "won"
                  ? "Nu ai pariuri câștigate încă."
                  : filter === "lost"
                    ? "Nu ai pariuri pierdute."
                    : state.user
                      ? "Nu ai pariuri plasate încă. Du-te la LIVE și pariază!"
                      : "Trebuie să fii autentificat."}
            </p>
            {filter === "all" && !loading && (
              <p style={{ fontSize: 10, color: "#252c40", marginTop: 8 }}>
                Total în store: {state.sportBets?.length ?? 0} pariuri · User:{" "}
                {state.user?.id?.slice(0, 8) ?? "necunoscut"}
              </p>
            )}
          </div>
        ) : (
          <div style={s.betsList}>
            {filtered.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        )}

        {/* Info about auto-check */}
        {pendingCount > 0 && (
          <div style={s.infoBox}>
            <span>ℹ️</span>
            <span>
              Ai <strong style={{ color: "#ffd23f" }}>{pendingCount}</strong>{" "}
              pariu(ri) în așteptare. Apasă{" "}
              <strong style={{ color: "#c8f135" }}>VERIFICĂ REZULTATE</strong>{" "}
              după ce meciurile s-au terminat pentru a primi câștigurile.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bet Card ─────────────────────────────────────────────────────────────────

function BetCard({ bet }: { bet: SportBet }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[bet.status];

  const date = new Date(bet.created_at).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const matchDate = new Date(bet.commence_time).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div style={{ ...bc.card, borderLeftColor: cfg.color }}>
      {/* Header row */}
      <div style={bc.top} onClick={() => setExpanded((e) => !e)}>
        <div style={bc.matchInfo}>
          <div style={bc.teams}>
            {bet.home_team} vs {bet.away_team}
          </div>
          <div style={bc.meta}>
            <span>{matchDate}</span>
            <span style={{ color: "#252c40" }}>·</span>
            <span>{bet.selections.length} selecție(i)</span>
            <span style={{ color: "#252c40" }}>·</span>
            <span>
              Cotă:{" "}
              <strong style={{ color: "#c8f135" }}>
                {Number(bet.total_odds).toFixed(2)}
              </strong>
            </span>
          </div>

          {/* Result score if settled */}
          {bet.status !== "pending" && bet.result_home !== null && (
            <div style={bc.score}>
              Scor final:{" "}
              <strong style={{ color: "#f0f4ff" }}>
                {bet.home_team} {bet.result_home} — {bet.result_away}{" "}
                {bet.away_team}
              </strong>
            </div>
          )}
        </div>

        <div style={bc.right}>
          {/* Status badge */}
          <div
            style={{
              ...bc.statusBadge,
              background: cfg.bg,
              borderColor: cfg.border,
              color: cfg.color,
            }}
          >
            {cfg.label}
          </div>

          {/* Amounts */}
          <div style={bc.amounts}>
            <span style={bc.stake}>-{Number(bet.stake).toFixed(2)} MDL</span>
            {bet.status === "won" && (
              <span style={bc.winAmt}>
                +{Number(bet.actual_win).toFixed(2)} MDL
              </span>
            )}
            {bet.status === "pending" && (
              <span style={bc.potAmt}>
                pot. {Number(bet.potential_win).toFixed(2)} MDL
              </span>
            )}
          </div>

          <span
            style={{
              ...bc.expandIcon,
              transform: expanded ? "rotate(180deg)" : "none",
            }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Expanded selections */}
      {expanded && (
        <div style={bc.selections}>
          {bet.selections.map((sel, i) => (
            <div key={i} style={bc.selRow}>
              <span style={bc.selMatch}>{sel.matchLabel}</span>
              <span style={bc.selPick}>{sel.pick}</span>
              <span style={bc.selOdd}>{Number(sel.odd).toFixed(2)}</span>
            </div>
          ))}
          <div style={bc.selFooter}>
            Plasat: {date}
            {bet.settled_at && (
              <span>
                {" "}
                · Verificat:{" "}
                {new Date(bet.settled_at).toLocaleString("ro-RO", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={sc.card}>
      <div style={sc.label}>{label}</div>
      <div style={{ ...sc.value, color }}>{value}</div>
    </div>
  );
}

// ─── Cashout Button ───────────────────────────────────────────────────────────
function CashoutButton({ bet }: { bet: SportBet }) {
  const { casinoWin, state, showToast } = useAppStore();
  const [loading, setLoading] = useState(false);

  async function handleCashout(pct: number) {
    if (!state.user) return;
    const amt = parseFloat(((Number(bet.stake) * pct) / 100).toFixed(2));
    setLoading(true);
    const ok = await requestCashout(
      bet.id,
      state.user.id,
      amt,
      Number(bet.stake),
      pct,
    );
    if (ok) {
      await casinoWin(amt);
      showToast(`✅ Cashout ${pct}% — +${amt} MDL returnat!`, "success");
    } else {
      showToast("❌ Eroare la cashout", "error");
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
      {[25, 50, 100].map((pct) => (
        <button
          key={pct}
          onClick={() => handleCashout(pct)}
          disabled={loading}
          style={{
            flex: 1,
            padding: "6px 4px",
            background: "rgba(255,107,43,0.1)",
            border: "1px solid rgba(255,107,43,0.25)",
            borderRadius: 6,
            color: "#ff6b2b",
            fontFamily: "'Bebas Neue', cursive",
            fontSize: 13,
            cursor: "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          💸 {pct}%<br />
          <span style={{ fontSize: 10 }}>
            +{((Number(bet.stake) * pct) / 100).toFixed(0)} MDL
          </span>
        </button>
      ))}
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
    maxWidth: 900,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap" as const,
  },
  title: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 36,
    letterSpacing: 3,
    color: "#f0f4ff",
  },
  subtitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#3d4660",
    letterSpacing: 2,
    marginTop: 4,
  },
  btnCheck: {
    background: "linear-gradient(135deg, #c8f135, #a8d400)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    letterSpacing: 2,
    padding: "12px 24px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    transition: "all 0.15s",
  },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 },
  filters: { display: "flex", gap: 6 },
  filterBtn: {
    padding: "7px 16px",
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    color: "#3d4660",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: 1,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  filterBtnActive: {
    borderColor: "rgba(200,241,53,0.3)",
    color: "#c8f135",
    background: "rgba(200,241,53,0.06)",
  },
  betsList: { display: "flex", flexDirection: "column", gap: 8 },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: "60px 20px",
    textAlign: "center" as const,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    color: "#3d4660",
  },
  infoBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "rgba(255,210,63,0.06)",
    border: "1px solid rgba(255,210,63,0.15)",
    borderRadius: 8,
    padding: "12px 16px",
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    color: "#8892a4",
    lineHeight: 1.6,
  },
};

const bc: Record<string, React.CSSProperties> = {
  card: {
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderLeft: "3px solid",
    borderRadius: 8,
    overflow: "hidden",
    transition: "background 0.15s",
  },
  top: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "14px 16px",
    cursor: "pointer",
    gap: 12,
  },
  matchInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  teams: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "#f0f4ff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  meta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#3d4660",
  },
  score: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#8892a4",
    marginTop: 2,
  },
  right: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  statusBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 4,
    border: "1px solid",
  },
  amounts: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  stake: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#8892a4",
  },
  winAmt: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    color: "#c8f135",
  },
  potAmt: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#ffd23f",
  },
  expandIcon: {
    fontSize: 14,
    color: "#3d4660",
    transition: "transform 0.2s",
    marginTop: 4,
  },
  selections: {
    borderTop: "1px solid rgba(255,255,255,0.04)",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "#0d1017",
  },
  selRow: { display: "flex", alignItems: "center", gap: 12 },
  selMatch: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    color: "#8892a4",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  selPick: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#f0f4ff",
    flexShrink: 0,
  },
  selOdd: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    color: "#c8f135",
    flexShrink: 0,
  },
  selFooter: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
    marginTop: 4,
  },
};

const sc: Record<string, React.CSSProperties> = {
  card: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    padding: "16px 20px",
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
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
