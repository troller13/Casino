import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/AppStore";

const NAV_ITEMS = [
  { to: "/live", label: "⚡ LIVE" },
  { to: "/prematch", label: "📅 PRE-MATCH" },
  { to: "/casino", label: "🎰 CASINO" },
];

export function Header() {
  const { state, signOut, showToast } = useAppStore();
  const navigate = useNavigate();

  const fmtBalance = (n: number) =>
    n.toLocaleString("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  async function handleSignOut() {
    await signOut();
    showToast("👋 Deconectat!", "info");
    navigate("/auth");
  }

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        {/* Logo → navigate home */}
        <NavLink to="/live" style={{ textDecoration: "none" }}>
          <div style={styles.logo}>
            <span style={styles.logoBet}>BET</span>
            <span style={styles.logoZone}>ZONE</span>
            <span style={styles.logoDot} />
          </div>
        </NavLink>

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
                ...(item.to === "/casino" ? styles.navLinkCasino : {}),
                ...(isActive && item.to === "/casino"
                  ? styles.navLinkCasinoActive
                  : {}),
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div style={styles.actions}>
          {state.user ? (
            <>
              <div style={styles.balance}>
                <span style={styles.balLabel}>SOLD</span>
                <span style={styles.balAmount}>
                  {fmtBalance(state.balance)}
                </span>
                <span style={styles.balCurrency}>RON</span>
              </div>

              <NavLink
                to="/profile"
                style={({ isActive }) => ({
                  ...styles.userBtn,
                  ...(isActive ? styles.userBtnActive : {}),
                })}
              >
                <span style={styles.userAvatar}>
                  {(
                    state.profile?.username?.[0] ??
                    state.user.email?.[0] ??
                    "?"
                  ).toUpperCase()}
                </span>
                <span style={styles.userName}>
                  {state.profile?.username ?? "Profil"}
                </span>
              </NavLink>

              <button
                onClick={handleSignOut}
                style={styles.btnLogout}
                title="Deconectare"
              >
                ⏻
              </button>
            </>
          ) : (
            <NavLink to="/auth" style={styles.btnLogin}>
              AUTENTIFICARE
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    height: 64,
    background: "rgba(6,8,12,0.96)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  inner: {
    maxWidth: 1600,
    margin: "0 auto",
    height: "100%",
    display: "flex",
    alignItems: "center",
    gap: 28,
    padding: "0 24px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    position: "relative",
    userSelect: "none",
    flexShrink: 0,
  },
  logoBet: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 30,
    letterSpacing: 3,
    color: "#c8f135",
  },
  logoZone: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 30,
    letterSpacing: 3,
    color: "#f0f4ff",
  },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#c8f135",
    position: "absolute",
    top: 4,
    right: -10,
    boxShadow: "0 0 10px #c8f135",
    animation: "pulse 2s ease-in-out infinite",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flex: 1,
    justifyContent: "center",
  },
  navLink: {
    padding: "7px 18px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#8892a4",
    background: "none",
    border: "1px solid transparent",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.18s ease",
    textDecoration: "none",
    display: "inline-block",
  },
  navLinkActive: {
    color: "#c8f135",
    background: "rgba(200,241,53,0.08)",
    borderColor: "rgba(200,241,53,0.25)",
  },
  navLinkCasino: { color: "#ff6b2b" },
  navLinkCasinoActive: {
    color: "#ff6b2b",
    background: "rgba(255,107,43,0.1)",
    borderColor: "rgba(255,107,43,0.35)",
    boxShadow: "0 0 14px rgba(255,107,43,0.15)",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  balance: {
    display: "flex",
    alignItems: "baseline",
    gap: 5,
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    padding: "6px 12px",
  },
  balLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
  },
  balAmount: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    color: "#c8f135",
    letterSpacing: 1,
  },
  balCurrency: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: "#8892a4",
  },
  userBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#111520",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    padding: "5px 12px",
    textDecoration: "none",
    transition: "all 0.15s",
  },
  userBtnActive: {
    borderColor: "rgba(200,241,53,0.25)",
    background: "rgba(200,241,53,0.06)",
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #c8f135, #6a8000)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 13,
    color: "#06080c",
    flexShrink: 0,
  },
  userName: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    color: "#f0f4ff",
  },
  btnLogout: {
    background: "none",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    color: "#3d4660",
    fontSize: 16,
    cursor: "pointer",
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  },
  btnDeposit: {
    background: "#c8f135",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 17,
    letterSpacing: 2,
    padding: "8px 20px",
    borderRadius: 6,
    cursor: "pointer",
    border: "none",
  },
  btnLogin: {
    background: "linear-gradient(135deg, #c8f135, #a8d400)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    letterSpacing: 2,
    padding: "8px 20px",
    borderRadius: 6,
    textDecoration: "none",
    display: "inline-block",
  },
};
