import React, { useEffect, useState } from "react";
import { useAppStore } from "../../store/AppStore";
import { useThemedStyles } from "../../store/ThemeContext";
import { supabase, IS_SUPABASE_CONFIGURED } from "../../services/supabase";

interface AdminStats {
  total_users: number;
  total_sport_bets: number;
  pending_bets: number;
  won_bets: number;
  total_wagered: number;
  total_paid_out: number;
  casino_wagered: number;
  blackjack_count: number;
  slots_count: number;
  roulette_count: number;
  plinko_count: number;
}

interface RecentUser {
  id: string;
  username: string;
  balance: number;
  created_at: string;
}

const ADMIN_EMAILS = ["admin@betzone.md", "troller13@gmail.com"]; // Adaugă emailul tău

export function AdminPage() {
  const { state } = useAppStore();
  const t = useThemedStyles();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "users" | "bets">("overview");
  const [recentBets, setRecentBets] = useState<Record<string, unknown>[]>([]);

  // Check admin access
  const isAdmin = ADMIN_EMAILS.includes(state.user?.email ?? "");

  useEffect(() => {
    if (!isAdmin || !IS_SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    Promise.all([
      supabase
        .from("admin_stats")
        .select("*")
        .single()
        .then(({ data }) => setStats(data as AdminStats)),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => setUsers((data ?? []) as RecentUser[])),
      supabase
        .from("sport_bets")
        .select("*, profiles(username)")
        .order("created_at", { ascending: false })
        .limit(30)
        .then(({ data }) => setRecentBets(data ?? [])),
    ]).finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 48 }}>🚫</span>
        <div
          style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: 28,
            letterSpacing: 3,
            color: "#ff2d55",
          }}
        >
          ACCES INTERZIS
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: t.text3,
          }}
        >
          Această pagină e rezervată administratorilor
        </div>
      </div>
    );
  }

  const ggr = stats
    ? stats.total_wagered - stats.total_paid_out + stats.casino_wagered * 0.05
    : 0;
  const sportHoldPct =
    stats && stats.total_wagered > 0
      ? (
          ((stats.total_wagered - stats.total_paid_out) / stats.total_wagered) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 36,
              letterSpacing: 3,
              color: "#ff2d55",
            }}
          >
            🔐 ADMIN PANEL
          </h1>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: t.text3,
              letterSpacing: 2,
            }}
          >
            Acces restricționat · {state.user?.email}
          </div>
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: t.text3,
          }}
        >
          {new Date().toLocaleString("ro-RO")}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["overview", "users", "bets"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            style={{
              padding: "9px 20px",
              background: tab === tb ? "rgba(255,45,85,0.12)" : t.bgCard,
              border: `1px solid ${tab === tb ? "rgba(255,45,85,0.35)" : t.border}`,
              borderRadius: 8,
              color: tab === tb ? "#ff2d55" : t.text3,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            {tb === "overview"
              ? "📊 OVERVIEW"
              : tb === "users"
                ? "👥 UTILIZATORI"
                : "🎯 PARIURI"}
          </button>
        ))}
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: t.text3,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Se încarcă date...
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {!loading && tab === "overview" && stats && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <AdminKPI
              label="UTILIZATORI TOTALI"
              value={String(stats.total_users)}
              color="#00e5ff"
              icon="👥"
            />
            <AdminKPI
              label="GGR ESTIMAT"
              value={`${ggr.toFixed(0)} MDL`}
              color="#c8f135"
              icon="💰"
            />
            <AdminKPI
              label="HOLD % SPORT"
              value={`${sportHoldPct}%`}
              color="#ffd23f"
              icon="📊"
            />
            <AdminKPI
              label="PARIURI PENDING"
              value={String(stats.pending_bets)}
              color="#ff6b2b"
              icon="⏳"
            />
          </div>

          {/* Sport bets breakdown */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <div
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 3,
                  color: t.text3,
                  marginBottom: 16,
                }}
              >
                PARIURI SPORTIVE
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <AdminRow
                  label="Total pariuri"
                  value={String(stats.total_sport_bets)}
                />
                <AdminRow
                  label="Câștigate"
                  value={String(stats.won_bets)}
                  color="#c8f135"
                />
                <AdminRow
                  label="Pending"
                  value={String(stats.pending_bets)}
                  color="#ffd23f"
                />
                <AdminRow
                  label="Total wagered"
                  value={`${Number(stats.total_wagered).toFixed(0)} MDL`}
                />
                <AdminRow
                  label="Total plătit"
                  value={`${Number(stats.total_paid_out).toFixed(0)} MDL`}
                  color="#ff2d55"
                />
                <AdminRow
                  label="Profit casă"
                  value={`${(Number(stats.total_wagered) - Number(stats.total_paid_out)).toFixed(0)} MDL`}
                  color="#c8f135"
                />
              </div>
            </div>

            <div
              style={{
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 3,
                  color: t.text3,
                  marginBottom: 16,
                }}
              >
                CASINO — JOCURI
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <AdminRow
                  label="Total casino wagered"
                  value={`${Number(stats.casino_wagered).toFixed(0)} MDL`}
                />
                <AdminRow
                  label="Blackjack"
                  value={`${stats.blackjack_count} runde`}
                />
                <AdminRow
                  label="Sloturi"
                  value={`${stats.slots_count} rotiri`}
                />
                <AdminRow
                  label="Ruletă"
                  value={`${stats.roulette_count} runde`}
                />
                <AdminRow label="Plinko" value={`${stats.plinko_count} bile`} />
              </div>
              {/* Casino chart bar */}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    color: t.text3,
                    marginBottom: 8,
                  }}
                >
                  POPULARITATE
                </div>
                {[
                  {
                    label: "Sloturi",
                    count: stats.slots_count,
                    color: "#ffd23f",
                  },
                  {
                    label: "Blackjack",
                    count: stats.blackjack_count,
                    color: "#c8f135",
                  },
                  {
                    label: "Ruletă",
                    count: stats.roulette_count,
                    color: "#ff6b2b",
                  },
                  {
                    label: "Plinko",
                    count: stats.plinko_count,
                    color: "#00e5ff",
                  },
                ].map((g) => {
                  const total =
                    stats.slots_count +
                      stats.blackjack_count +
                      stats.roulette_count +
                      stats.plinko_count || 1;
                  const pct = Math.round((g.count / total) * 100);
                  return (
                    <div
                      key={g.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 8,
                          color: t.text3,
                          width: 52,
                        }}
                      >
                        {g.label}
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: t.bgCard2,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: g.color,
                            borderRadius: 3,
                            transition: "width 1s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 8,
                          color: t.text3,
                          width: 30,
                          textAlign: "right",
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {!loading && tab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: 2,
              color: t.text3,
              marginBottom: 8,
            }}
          >
            ULTIMII 20 UTILIZATORI ÎNREGISTRAȚI
          </div>
          {users.map((u, i) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "10px 16px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 14,
                  color: t.text3,
                  width: 24,
                }}
              >
                #{i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: t.text1,
                  }}
                >
                  {u.username}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: t.text3,
                  }}
                >
                  {new Date(u.created_at).toLocaleDateString("ro-RO")}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 18,
                  color: "#c8f135",
                }}
              >
                {Number(u.balance).toFixed(0)} MDL
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── BETS ── */}
      {!loading && tab === "bets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: 2,
              color: t.text3,
              marginBottom: 8,
            }}
          >
            ULTIMELE 30 PARIURI
          </div>
          {recentBets.map((bet: Record<string, unknown>) => {
            const status = bet.status as string;
            const statusColor =
              status === "won"
                ? "#c8f135"
                : status === "lost"
                  ? "#ff2d55"
                  : "#ffd23f";
            const profile = bet.profiles as { username: string } | null;
            return (
              <div
                key={bet.id as string}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 80px 80px 80px",
                  gap: 12,
                  alignItems: "center",
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                }}
              >
                <span style={{ color: t.text3, fontSize: 9 }}>
                  {new Date(bet.created_at as string).toLocaleDateString(
                    "ro-RO",
                  )}
                </span>
                <span
                  style={{
                    color: t.text1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {profile?.username ?? "—"} · {bet.home_team as string} vs{" "}
                  {bet.away_team as string}
                </span>
                <span style={{ color: "#ffd23f" }}>
                  {Number(bet.stake).toFixed(0)} MDL
                </span>
                <span style={{ color: "#c8f135" }}>
                  {Number(bet.potential_win).toFixed(0)} MDL
                </span>
                <span style={{ color: statusColor, letterSpacing: 1 }}>
                  {status.toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminKPI({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
}) {
  const t = useThemedStyles();
  return (
    <div
      style={{
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            letterSpacing: 2,
            color: t.text3,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 28,
          color,
          letterSpacing: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AdminRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const t = useThemedStyles();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: t.text3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 16,
          color: color ?? t.text1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
