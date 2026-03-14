import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/AppStore";

type Mode = "login" | "register";

export function AuthPage() {
  const { signIn, signUp, showToast } = useAppStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    let err: string | null = null;
    if (mode === "login") {
      err = await signIn(email, password);
    } else {
      if (!username.trim()) {
        setError("Introduceți un username.");
        setLoading(false);
        return;
      }
      err = await signUp(email, password, username);
      if (!err) {
        showToast(
          "✅ Cont creat! Verificați email-ul pentru confirmare.",
          "success",
        );
        setMode("login");
        setLoading(false);
        return;
      }
    }
    if (err) {
      setError(err);
    } else {
      showToast("✅ Bine ai venit!", "success");
      navigate("/live");
    }
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.bgGrid} />
      <div style={s.orb1} />
      <div style={s.orb2} />

      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoBet}>BET</span>
          <span style={s.logoZone}>ZONE</span>
          <div style={s.logoDot} />
        </div>
        <p style={s.tagline}>Pariuri live · Casino · Cote în timp real</p>

        <div style={s.tabs}>
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}
            >
              {m === "login" ? "AUTENTIFICARE" : "CONT NOU"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {mode === "register" && (
            <div style={s.field}>
              <label style={s.label}>USERNAME</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: LuckyPlayer88"
                style={s.input}
              />
            </div>
          )}
          <div style={s.field}>
            <label style={s.label}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="adresa@email.com"
              style={s.input}
              required
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>PAROLĂ</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={s.input}
              required
            />
          </div>
          {error && <div style={s.errorBox}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btnSubmit, opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? "⏳ SE PROCESEAZĂ..."
              : mode === "login"
                ? "→ INTRĂ ÎN CONT"
                : "→ CREEAZĂ CONT"}
          </button>
        </form>

        <div style={s.bonus}>
          🎁 <strong style={{ color: "#c8f135" }}>1.000 RON</strong> bonus
          virtual la înregistrare · 18+ · Joacă responsabil
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#06080c",
    position: "relative",
    overflow: "hidden",
    padding: "24px",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
  },
  orb1: {
    position: "fixed",
    width: 600,
    height: 600,
    top: -200,
    left: -200,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(200,241,53,0.07) 0%, transparent 70%)",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  orb2: {
    position: "fixed",
    width: 500,
    height: 500,
    bottom: -150,
    right: -150,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,107,43,0.06) 0%, transparent 70%)",
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "44px 40px",
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    animation: "fadeInUp 0.5s ease",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    position: "relative",
    justifyContent: "center",
  },
  logoBet: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 40,
    letterSpacing: 4,
    color: "#c8f135",
  },
  logoZone: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 40,
    letterSpacing: 4,
    color: "#f0f4ff",
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#c8f135",
    position: "absolute",
    top: 5,
    right: -10,
    boxShadow: "0 0 12px #c8f135",
    animation: "pulse 2s ease-in-out infinite",
  },
  tagline: {
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#3d4660",
    letterSpacing: 2,
    marginTop: -12,
  },
  tabs: {
    display: "flex",
    background: "#080a0f",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    padding: "9px 0",
    background: "none",
    border: "none",
    borderRadius: 6,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: "#3d4660",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "#111520",
    color: "#c8f135",
    boxShadow: "0 0 0 1px rgba(200,241,53,0.2)",
  },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
  },
  input: {
    background: "#080a0f",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#f0f4ff",
    padding: "12px 14px",
    fontFamily: "'Syne', sans-serif",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
    width: "100%",
  },
  errorBox: {
    background: "rgba(255,45,85,0.1)",
    border: "1px solid rgba(255,45,85,0.3)",
    borderRadius: 6,
    padding: "10px 14px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#ff2d55",
  },
  btnSubmit: {
    background: "linear-gradient(135deg, #c8f135, #a8d400)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    letterSpacing: 3,
    padding: "14px 0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s",
    marginTop: 4,
  },
  bonus: {
    textAlign: "center",
    fontFamily: "'Syne', sans-serif",
    fontSize: 11,
    color: "#3d4660",
    lineHeight: 1.6,
    background: "rgba(200,241,53,0.04)",
    border: "1px solid rgba(200,241,53,0.08)",
    borderRadius: 8,
    padding: "12px 16px",
  },
};
