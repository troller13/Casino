import React, { useState, useEffect } from "react";
import { useAppStore } from "../store/AppStore";
import { useThemedStyles } from "../store/ThemeContext";
import {
  supabase,
  IS_SUPABASE_CONFIGURED,
  addBalancePoint,
} from "../services/supabase";

interface WalletTx {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  status: string;
  method: string;
  notes: string;
  created_at: string;
}

const TYPE_META: Record<
  string,
  { label: string; color: string; icon: string; sign: string }
> = {
  deposit: { label: "Depunere", color: "#c8f135", icon: "↓", sign: "+" },
  withdraw: { label: "Retragere", color: "#ff6b2b", icon: "↑", sign: "-" },
  bonus: { label: "Bonus", color: "#00e5ff", icon: "🎁", sign: "+" },
  bet_win: { label: "Câștig pariu", color: "#c8f135", icon: "🏆", sign: "+" },
  bet_loss: { label: "Pariu pierdut", color: "#ff2d55", icon: "❌", sign: "-" },
  casino_win: {
    label: "Câștig casino",
    color: "#ffd23f",
    icon: "🎰",
    sign: "+",
  },
  casino_loss: {
    label: "Pierdere casino",
    color: "#ff2d55",
    icon: "🎰",
    sign: "-",
  },
};

const METHODS = [
  {
    id: "visa",
    label: "Visa / Mastercard",
    icon: "💳",
    minDeposit: 50,
    maxDeposit: 10000,
  },
  {
    id: "revolut",
    label: "Revolut",
    icon: "📱",
    minDeposit: 10,
    maxDeposit: 5000,
  },
  {
    id: "crypto",
    label: "Crypto (USDT)",
    icon: "🔷",
    minDeposit: 20,
    maxDeposit: 50000,
  },
  {
    id: "bank",
    label: "Transfer bancar",
    icon: "🏦",
    minDeposit: 100,
    maxDeposit: 100000,
  },
];

export function WalletPage() {
  const { state, casinoWin, casinoDeduct, showToast } = useAppStore();
  const t = useThemedStyles();
  const [tab, setTab] = useState<"overview" | "deposit" | "withdraw">(
    "overview",
  );
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("visa");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cardNum, setCardNum] = useState("");
  const [successAnim, setSuccessAnim] = useState(false);

  useEffect(() => {
    if (!state.user || !IS_SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setTransactions((data ?? []) as WalletTx[]);
        setLoading(false);
      });
  }, [state.user]);

  async function addTransaction(
    type: string,
    amt: number,
    methodId: string,
    notes = "",
  ) {
    if (!state.user) return;
    const balanceAfter = state.balance + (type === "deposit" ? amt : -amt);
    await supabase.from("wallet_transactions").insert({
      user_id: state.user.id,
      type,
      amount: amt,
      balance_after: balanceAfter,
      status: "completed",
      method: methodId,
      notes,
    });
    // Refresh
    const { data } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setTransactions((data ?? []) as WalletTx[]);
  }

  async function handleDeposit() {
    const amt = parseFloat(amount);
    const m = METHODS.find((x) => x.id === method)!;
    if (!amt || amt < m.minDeposit || amt > m.maxDeposit) {
      showToast(
        `Suma trebuie să fie între ${m.minDeposit} și ${m.maxDeposit} MDL`,
        "error",
      );
      return;
    }
    setProcessing(true);
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 1800));
    await casinoWin(amt);
    await addTransaction("deposit", amt, method);
    await addBalancePoint(state.user!.id, state.balance + amt, amt, "deposit");
    setSuccessAnim(true);
    setTimeout(() => setSuccessAnim(false), 2000);
    showToast(`✅ ${amt} MDL depuși cu succes!`, "success");
    setAmount("");
    setProcessing(false);
    setTab("overview");
  }

  async function handleWithdraw() {
    const amt = parseFloat(amount);
    if (!amt || amt < 50) {
      showToast("Suma minimă de retragere este 50 MDL", "error");
      return;
    }
    if (amt > state.balance) {
      showToast("Sold insuficient!", "error");
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    await casinoDeduct(amt);
    await addTransaction("withdraw", amt, method);
    await addBalancePoint(
      state.user!.id,
      state.balance - amt,
      -amt,
      "withdraw",
    );
    showToast(
      `✅ ${amt} MDL retrași! Procesare 1-3 zile lucrătoare.`,
      "success",
    );
    setAmount("");
    setProcessing(false);
    setTab("overview");
  }

  const totalDeposited = transactions
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalWithdrawn = transactions
    .filter((t) => t.type === "withdraw")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalWon = transactions
    .filter((t) => ["bet_win", "casino_win", "bonus"].includes(t.type))
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div style={{ padding: "24px", maxWidth: 860, margin: "0 auto" }}>
      <style>{`
        @keyframes successPop { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes processingDots { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 36,
              letterSpacing: 3,
              color: t.text1,
            }}
          >
            💳 PORTOFEL
          </h1>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: t.text3,
              letterSpacing: 2,
              marginTop: 4,
            }}
          >
            Gestionează fondurile tale
          </p>
        </div>
        {/* Balance card */}
        <div
          style={{
            background: successAnim ? t.accentBg : t.bgCard,
            border: `1px solid ${successAnim ? t.accent : t.border}`,
            borderRadius: 14,
            padding: "16px 24px",
            transition: "all 0.3s",
            animation: successAnim ? "successPop 0.5s ease" : "none",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              letterSpacing: 3,
              color: t.text3,
            }}
          >
            SOLD DISPONIBIL
          </div>
          <div
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 34,
              color: t.accent,
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            {state.balance.toLocaleString("ro-RO", {
              minimumFractionDigits: 2,
            })}{" "}
            MDL
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "TOTAL DEPUS",
            value: `${totalDeposited.toFixed(0)} MDL`,
            color: "#c8f135",
          },
          {
            label: "TOTAL RETRAS",
            value: `${totalWithdrawn.toFixed(0)} MDL`,
            color: "#ff6b2b",
          },
          {
            label: "CÂȘTIGURI",
            value: `${totalWon.toFixed(0)} MDL`,
            color: "#ffd23f",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7,
                letterSpacing: 2,
                color: t.text3,
                marginBottom: 6,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 22,
                color: s.color,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["overview", "deposit", "withdraw"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            style={{
              flex: 1,
              padding: "10px",
              background: tab === tb ? t.accentBg : t.bgCard,
              border: `1px solid ${tab === tb ? t.accent + "44" : t.border}`,
              borderRadius: 8,
              color: tab === tb ? t.accent : t.text3,
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 16,
              letterSpacing: 2,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {tb === "overview"
              ? "📋 ISTORIC"
              : tb === "deposit"
                ? "↓ DEPUNE"
                : "↑ RETRAGE"}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: t.text3,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
              }}
            >
              Se încarcă...
            </div>
          )}
          {!loading && transactions.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "50px",
                color: t.text3,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
              Nicio tranzacție încă. Fă prima depunere!
            </div>
          )}
          {transactions.map((tx) => {
            const meta = TYPE_META[tx.type] ?? {
              label: tx.type,
              color: t.text2,
              icon: "·",
              sign: "",
            };
            const isPositive = [
              "deposit",
              "bonus",
              "bet_win",
              "casino_win",
            ].includes(tx.type);
            return (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: meta.color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {meta.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: t.text1,
                    }}
                  >
                    {meta.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: t.text3,
                    }}
                  >
                    {tx.method} ·{" "}
                    {new Date(tx.created_at).toLocaleString("ro-RO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "'Bebas Neue', cursive",
                      fontSize: 20,
                      color: isPositive ? "#c8f135" : "#ff2d55",
                    }}
                  >
                    {meta.sign}
                    {Number(tx.amount).toFixed(2)} MDL
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: t.text3,
                    }}
                  >
                    Sold: {Number(tx.balance_after).toFixed(2)} MDL
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8,
                    letterSpacing: 1,
                    padding: "2px 7px",
                    borderRadius: 10,
                    background:
                      tx.status === "completed"
                        ? "rgba(200,241,53,0.1)"
                        : "rgba(255,210,63,0.1)",
                    color: tx.status === "completed" ? "#c8f135" : "#ffd23f",
                  }}
                >
                  {tx.status === "completed" ? "FINALIZAT" : "ÎN PROCESARE"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DEPOSIT TAB ── */}
      {tab === "deposit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: 2,
              color: t.text3,
            }}
          >
            METODĂ DE PLATĂ
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}
          >
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  padding: "14px 16px",
                  background: method === m.id ? t.accentBg : t.bgCard,
                  border: `1px solid ${method === m.id ? t.accent + "44" : t.border}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 22 }}>{m.icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      color: method === m.id ? t.accent : t.text1,
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      color: t.text3,
                    }}
                  >
                    Min {m.minDeposit} MDL
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Card number (visual only for card) */}
          {method === "visa" && (
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: t.text3,
                  marginBottom: 6,
                }}
              >
                NUMĂR CARD (SIMULAT)
              </div>
              <input
                value={cardNum}
                onChange={(e) =>
                  setCardNum(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 16)
                      .replace(/(.{4})/g, "$1 ")
                      .trim(),
                  )
                }
                placeholder="0000 0000 0000 0000"
                style={{
                  width: "100%",
                  background: t.bgInput,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  color: t.text1,
                  padding: "12px 16px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 16,
                  outline: "none",
                  boxSizing: "border-box",
                  letterSpacing: 2,
                }}
              />
            </div>
          )}

          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: 2,
                color: t.text3,
                marginBottom: 6,
              }}
            >
              SUMA (MDL)
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[50, 100, 200, 500, 1000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    background: amount === String(v) ? t.accentBg : t.bgCard2,
                    border: `1px solid ${amount === String(v) ? t.accent + "44" : t.border}`,
                    borderRadius: 6,
                    color: amount === String(v) ? t.accent : t.text3,
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${METHODS.find((m) => m.id === method)?.minDeposit} MDL`}
              style={{
                width: "100%",
                background: t.bgInput,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                color: t.text1,
                padding: "12px 16px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div
              style={{
                background: t.accentBg,
                border: `1px solid ${t.accent}22`,
                borderRadius: 8,
                padding: "12px 16px",
                fontFamily: "'Syne', sans-serif",
                fontSize: 13,
                color: t.text1,
              }}
            >
              Vei primi:{" "}
              <strong style={{ color: t.accent }}>
                {parseFloat(amount).toFixed(2)} MDL
              </strong>{" "}
              în contul tău
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={processing || !amount}
            style={{
              width: "100%",
              background: processing
                ? t.bgCard2
                : `linear-gradient(135deg, ${t.accent}, ${t.accent}cc)`,
              color: processing ? t.text3 : "#06080c",
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 20,
              letterSpacing: 3,
              padding: "14px 0",
              border: "none",
              borderRadius: 10,
              cursor: processing ? "default" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {processing
              ? "⏳ SE PROCESEAZĂ..."
              : `↓ DEPUNE ${amount ? parseFloat(amount).toFixed(0) + " MDL" : ""}`}
          </button>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: t.text3,
              textAlign: "center",
            }}
          >
            🔒 Simulare — nicio tranzacție reală nu se efectuează · 18+ · Joacă
            responsabil
          </p>
        </div>
      )}

      {/* ── WITHDRAW TAB ── */}
      {tab === "withdraw" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "16px",
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
              DISPONIBIL PENTRU RETRAGERE
            </span>
            <span
              style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 26,
                color: t.accent,
              }}
            >
              {state.balance.toFixed(2)} MDL
            </span>
          </div>

          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              letterSpacing: 2,
              color: t.text3,
            }}
          >
            DESTINAȚIE
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 8,
            }}
          >
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  padding: "12px 14px",
                  background:
                    method === m.id ? "rgba(255,107,43,0.1)" : t.bgCard,
                  border: `1px solid ${method === m.id ? "rgba(255,107,43,0.35)" : t.border}`,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    color: method === m.id ? "#ff6b2b" : t.text1,
                  }}
                >
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: 2,
                color: t.text3,
                marginBottom: 6,
              }}
            >
              SUMA (min 50 MDL)
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[100, 250, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(Math.min(v, state.balance)))}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    background:
                      amount === String(v) ? "rgba(255,107,43,0.1)" : t.bgCard2,
                    border: `1px solid ${amount === String(v) ? "rgba(255,107,43,0.35)" : t.border}`,
                    borderRadius: 6,
                    color: amount === String(v) ? "#ff6b2b" : t.text3,
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {v}
                </button>
              ))}
              <button
                onClick={() => setAmount(state.balance.toFixed(0))}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  background: t.bgCard2,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  color: t.text3,
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                TOT
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Suma de retras (MDL)"
              min={50}
              max={state.balance}
              style={{
                width: "100%",
                background: t.bgInput,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                color: t.text1,
                padding: "12px 16px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={handleWithdraw}
            disabled={processing || !amount || parseFloat(amount) < 50}
            style={{
              width: "100%",
              background: processing
                ? t.bgCard2
                : "linear-gradient(135deg, #ff6b2b, #c44000)",
              color: processing ? t.text3 : "#fff",
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 20,
              letterSpacing: 3,
              padding: "14px 0",
              border: "none",
              borderRadius: 10,
              cursor: processing ? "default" : "pointer",
            }}
          >
            {processing
              ? "⏳ SE PROCESEAZĂ..."
              : `↑ RETRAGE ${amount ? parseFloat(amount).toFixed(0) + " MDL" : ""}`}
          </button>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              color: t.text3,
              textAlign: "center",
            }}
          >
            Procesare 1-3 zile lucrătoare · Min 50 MDL · Simulare
          </p>
        </div>
      )}
    </div>
  );
}
