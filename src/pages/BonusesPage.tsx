import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/AppStore";
import type { UserBonus } from "../services/supabase.ts";

// ─── Bonus config ──────────────────────────────────────────────────────────────
const BONUS_META: Record<
  string,
  {
    icon: string;
    color: string;
    bg: string;
    border: string;
    howTo: string;
  }
> = {
  welcome: {
    icon: "🎁",
    color: "#c8f135",
    bg: "rgba(200,241,53,0.08)",
    border: "rgba(200,241,53,0.2)",
    howTo: "Autentifică-te pentru prima dată",
  },
  first_bet: {
    icon: "⚽",
    color: "#00e5ff",
    bg: "rgba(0,229,255,0.08)",
    border: "rgba(0,229,255,0.2)",
    howTo: "Plasează primul tău pariu sportiv",
  },
  first_win: {
    icon: "🏆",
    color: "#ffd23f",
    bg: "rgba(255,210,63,0.08)",
    border: "rgba(255,210,63,0.2)",
    howTo: "Câștigă primul tău pariu sportiv",
  },
  streak_3: {
    icon: "🔥",
    color: "#ff6b2b",
    bg: "rgba(255,107,43,0.08)",
    border: "rgba(255,107,43,0.2)",
    howTo: "Plasează 3 pariuri (sport sau casino)",
  },
  high_roller: {
    icon: "💎",
    color: "#cc44ff",
    bg: "rgba(204,68,255,0.08)",
    border: "rgba(204,68,255,0.2)",
    howTo: "Pariază minimum 100 MDL într-un singur pariu",
  },
  daily_login: {
    icon: "📅",
    color: "#00cc88",
    bg: "rgba(0,204,136,0.08)",
    border: "rgba(0,204,136,0.2)",
    howTo: "Autentifică-te în 3 zile consecutive",
  },
};

export function BonusesPage() {
  const { state, loadBonuses, claimUserBonus, showToast } = useAppStore();
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    loadBonuses();
  }, [loadBonuses]);

  const available = state.bonuses.filter((b) => b.status === "available");
  const claimed = state.bonuses.filter((b) => b.status === "claimed");
  const readyCount = available.filter((b) => b.progress >= b.target).length;

  async function handleClaim(bonus: UserBonus) {
    if (bonus.progress < bonus.target) {
      showToast("⚠️ Completează condiția pentru a revendica bonusul!", "error");
      return;
    }
    setClaiming(bonus.id);
    await claimUserBonus(bonus.id);
    setClaiming(null);
  }

  return (
    <div style={s.page}>
      <style>{`
        @keyframes shimmerBonus {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes readyPulse {
          0%,100% { box-shadow: 0 0 0 rgba(200,241,53,0); }
          50%     { box-shadow: 0 0 24px rgba(200,241,53,0.4); }
        }
        @keyframes coinSpin {
          from { transform: rotateY(0deg); }
          to   { transform: rotateY(360deg); }
        }
        @keyframes claimPop {
          0%   { transform: scale(0.92); opacity: 0; }
          60%  { transform: scale(1.04); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.title}>🎁 BONUSURI</h1>
            <p style={s.subtitle}>
              Completează misiuni pentru a debloca bonusuri în MDL
            </p>
          </div>
          <div style={s.headerRight}>
            <div style={s.balCard}>
              <span style={s.balLbl}>SOLD CURENT</span>
              <span style={s.balVal}>
                {state.balance.toLocaleString("ro-RO", {
                  minimumFractionDigits: 2,
                })}{" "}
                MDL
              </span>
            </div>
            {readyCount > 0 && (
              <div style={s.readyBadge}>{readyCount} gata de revendicat!</div>
            )}
          </div>
        </div>

        {/* Loading */}
        {state.bonusLoading && (
          <div style={s.loadingRow}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={s.skeletonCard} />
            ))}
          </div>
        )}

        {/* No bonuses yet */}
        {!state.bonusLoading && state.bonuses.length === 0 && (
          <div style={s.empty}>
            <span style={{ fontSize: 50 }}>🎰</span>
            <p style={s.emptyTitle}>Niciun bonus disponibil încă</p>
            <p style={s.emptySub}>
              Bonusurile se activează automat când efectuezi acțiuni în
              aplicație. Începe cu un pariu sau joacă la casino!
            </p>
            <div style={s.emptyBtns}>
              <button onClick={() => navigate("/live")} style={s.btnGoLive}>
                ⚽ PARIURI LIVE
              </button>
              <button onClick={() => navigate("/casino")} style={s.btnGoCasino}>
                🎰 CASINO
              </button>
            </div>
          </div>
        )}

        {/* Available bonuses */}
        {available.length > 0 && (
          <section>
            <div style={s.sectionLabel}>DISPONIBILE ({available.length})</div>
            <div style={s.grid}>
              {available.map((bonus) => (
                <BonusCard
                  key={bonus.id}
                  bonus={bonus}
                  onClaim={handleClaim}
                  claiming={claiming === bonus.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Claimed bonuses */}
        {claimed.length > 0 && (
          <section>
            <div style={s.sectionLabel}>REVENDICATE ({claimed.length})</div>
            <div style={s.grid}>
              {claimed.map((bonus) => (
                <BonusCard
                  key={bonus.id}
                  bonus={bonus}
                  onClaim={handleClaim}
                  claiming={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <div style={s.howItWorks}>
          <div style={s.sectionLabel}>CUM FUNCȚIONEAZĂ</div>
          <div style={s.howGrid}>
            {Object.entries(BONUS_META).map(([id, meta]) => (
              <div key={id} style={{ ...s.howCard, borderColor: meta.border }}>
                <span style={{ fontSize: 24 }}>{meta.icon}</span>
                <div style={{ ...s.howColor, color: meta.color }}>
                  {id.replace("_", " ").toUpperCase()}
                </div>
                <div style={s.howText}>{meta.howTo}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bonus Card ───────────────────────────────────────────────────────────────
function BonusCard({
  bonus,
  onClaim,
  claiming,
}: {
  bonus: UserBonus;
  onClaim: (b: UserBonus) => void;
  claiming: boolean;
}) {
  const meta = BONUS_META[bonus.bonus_id] ?? {
    icon: "🎁",
    color: "#c8f135",
    bg: "rgba(200,241,53,0.08)",
    border: "rgba(200,241,53,0.2)",
    howTo: "",
  };

  const isClaimed = bonus.status === "claimed";
  const isReady = !isClaimed && bonus.progress >= bonus.target;
  const pct = Math.min(100, Math.round((bonus.progress / bonus.target) * 100));
  const bonusDef = bonus.bonus as unknown as
    | { title: string; description: string }
    | undefined;

  const expiresAt = bonus.expires_at ? new Date(bonus.expires_at) : null;
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div
      style={{
        ...bc.card,
        background: meta.bg,
        borderColor: isReady
          ? meta.color
          : isClaimed
            ? "rgba(255,255,255,0.04)"
            : meta.border,
        animation: isReady
          ? "readyPulse 2s ease-in-out infinite"
          : "claimPop 0.4s ease",
        opacity: isClaimed ? 0.6 : 1,
      }}
    >
      {/* Badge */}
      {isReady && (
        <div style={{ ...bc.badge, background: meta.color, color: "#06080c" }}>
          GATA DE REVENDICAT
        </div>
      )}
      {isClaimed && (
        <div
          style={{
            ...bc.badge,
            background: "rgba(255,255,255,0.1)",
            color: "#8892a4",
          }}
        >
          REVENDICAT
        </div>
      )}

      {/* Icon + title */}
      <div style={bc.top}>
        <div style={{ ...bc.icon, background: `${meta.color}22` }}>
          <span
            style={{
              fontSize: 28,
              display: "block",
              animation: isReady ? "coinSpin 2s linear infinite" : "none",
            }}
          >
            {meta.icon}
          </span>
        </div>
        <div style={bc.info}>
          <div style={{ ...bc.title, color: meta.color }}>
            {bonusDef?.title ?? bonus.bonus_id}
          </div>
          <div style={bc.desc}>{bonusDef?.description ?? meta.howTo}</div>
        </div>
        <div style={bc.amount}>
          <span
            style={{ ...bc.amtVal, color: isClaimed ? "#8892a4" : meta.color }}
          >
            +{Number(bonus.amount).toFixed(0)}
          </span>
          <span style={bc.amtCurr}>MDL</span>
        </div>
      </div>

      {/* Progress bar */}
      {!isClaimed && (
        <div style={bc.progressWrap}>
          <div style={bc.progressTrack}>
            <div
              style={{
                ...bc.progressFill,
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${meta.color}aa, ${meta.color})`,
                boxShadow: isReady ? `0 0 8px ${meta.color}66` : "none",
              }}
            />
          </div>
          <div style={bc.progressLabel}>
            <span style={{ color: meta.color }}>{bonus.progress}</span>
            <span style={{ color: "#3d4660" }}>/{bonus.target}</span>
            <span style={{ color: "#252c40", marginLeft: 4 }}>({pct}%)</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={bc.footer}>
        {daysLeft !== null && !isClaimed && (
          <span
            style={{
              ...bc.expires,
              color: daysLeft <= 3 ? "#ff2d55" : "#3d4660",
            }}
          >
            {daysLeft > 0 ? `Expiră în ${daysLeft} zile` : "Expirat"}
          </span>
        )}
        {isClaimed && bonus.claimed_at && (
          <span style={bc.expires}>
            Revendicat: {new Date(bonus.claimed_at).toLocaleDateString("ro-RO")}
          </span>
        )}

        {!isClaimed && (
          <button
            onClick={() => onClaim(bonus)}
            disabled={!isReady || claiming}
            style={{
              ...bc.btnClaim,
              background: isReady
                ? `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`
                : "rgba(255,255,255,0.05)",
              color: isReady ? "#06080c" : "#3d4660",
              cursor: isReady ? "pointer" : "not-allowed",
              opacity: claiming ? 0.6 : 1,
            }}
          >
            {claiming ? "⏳" : isReady ? "🎁 REVENDICĂ" : `${pct}% completat`}
          </button>
        )}
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
    gap: 28,
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
    fontSize: 38,
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
  headerRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  balCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8,
    padding: "10px 16px",
  },
  balLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    color: "#3d4660",
  },
  balVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    color: "#c8f135",
  },
  readyBadge: {
    background: "linear-gradient(135deg, #c8f135, #a0cc00)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 13,
    letterSpacing: 1,
    padding: "6px 14px",
    borderRadius: 20,
    animation: "readyPulse 2s ease-in-out infinite",
  },
  loadingRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
  },
  skeletonCard: {
    height: 180,
    borderRadius: 14,
    background: "linear-gradient(90deg, #111520 25%, #161b2e 50%, #111520 75%)",
    backgroundSize: "400px 100%",
    animation: "shimmerBonus 1.5s infinite",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    padding: "60px 20px",
    textAlign: "center" as const,
  },
  emptyTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 26,
    letterSpacing: 2,
    color: "#3d4660",
  },
  emptySub: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#252c40",
    maxWidth: 400,
    lineHeight: 1.7,
  },
  emptyBtns: { display: "flex", gap: 12, marginTop: 8 },
  btnGoLive: {
    background: "rgba(200,241,53,0.1)",
    border: "1px solid rgba(200,241,53,0.25)",
    borderRadius: 8,
    color: "#c8f135",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    letterSpacing: 2,
    padding: "10px 20px",
    cursor: "pointer",
  },
  btnGoCasino: {
    background: "rgba(255,107,43,0.1)",
    border: "1px solid rgba(255,107,43,0.25)",
    borderRadius: 8,
    color: "#ff6b2b",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    letterSpacing: 2,
    padding: "10px 20px",
    cursor: "pointer",
  },
  sectionLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 3,
    color: "#3d4660",
    marginBottom: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
  },
  howItWorks: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: "20px 24px",
  },
  howGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 10,
  },
  howCard: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid",
    borderRadius: 10,
    padding: "14px 10px",
    textAlign: "center" as const,
  },
  howColor: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 12,
    letterSpacing: 1,
  },
  howText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
    lineHeight: 1.5,
  },
};

const bc: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid",
    borderRadius: 14,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    position: "relative",
    overflow: "hidden",
    transition: "border-color 0.3s",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 10,
  },
  top: { display: "flex", alignItems: "flex-start", gap: 12 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    letterSpacing: 1,
    marginBottom: 4,
  },
  desc: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#8892a4",
    lineHeight: 1.5,
  },
  amount: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  amtVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 30,
    lineHeight: "1",
  },
  amtCurr: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  progressWrap: { display: "flex", flexDirection: "column", gap: 5 },
  progressTrack: {
    height: 6,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.5s ease",
    minWidth: 4,
  },
  progressLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  expires: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  btnClaim: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 14,
    letterSpacing: 2,
    padding: "8px 16px",
    border: "none",
    borderRadius: 8,
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  },
};
