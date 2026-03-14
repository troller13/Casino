import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Header } from "./components/Header";
import { Ticker } from "./components/Ticker";
import { ToastContainer } from "./components/ToastContainer";
import { AuthPage } from "./pages/AuthPage";
import { LivePage } from "./pages/LivePage";
import { CasinoRoute } from "./pages/CasinoRoute";
import { ProfilePage } from "./pages/ProfilePage";
import { useAppStore } from "./store/AppStore";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAppStore();
  if (state.authLoading) return <LoadingScreen />;
  if (!state.user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAppStore();
  if (state.authLoading) return <LoadingScreen />;
  if (state.user) return <Navigate to="/live" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  // Daca loading dureaza mai mult de 4s, aratam buton de escape
  const [showEscape, setShowEscape] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#06080c",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize: 36,
          letterSpacing: 4,
          color: "#c8f135",
        }}
      >
        BETZONE
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid rgba(255,255,255,0.06)",
          borderTopColor: "#c8f135",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      {showEscape && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
          }}
        >
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "#3d4660",
            }}
          >
            Conexiunea durează prea mult...
          </p>
          <a
            href="/auth"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: "#c8f135",
              textDecoration: "underline",
            }}
          >
            Mergi la pagina de login
          </a>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = "/auth";
            }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: "#ff2d55",
              background: "none",
              border: "1px solid rgba(255,45,85,0.3)",
              borderRadius: 6,
              padding: "6px 14px",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Resetează sesiunea
          </button>
        </div>
      )}
    </div>
  );
}

function PreMatchPage() {
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "60px auto",
        padding: "0 24px",
        textAlign: "center",
        fontFamily: "'Bebas Neue', cursive",
        color: "#3d4660",
        fontSize: 32,
        letterSpacing: 3,
      }}
    >
      🚧 PRE-MATCH ÎN CURÂND
    </div>
  );
}

export default function App() {
  const { state } = useAppStore();

  const showLayout = state.user && !state.authLoading;

  return (
    <div style={styles.root}>
      <div style={styles.bgGrid} />
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />

      {showLayout && (
        <>
          <Header />
          <Ticker />
        </>
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        <Routes>
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route
            path="/live"
            element={
              <ProtectedRoute>
                <LivePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prematch"
            element={
              <ProtectedRoute>
                <PreMatchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/casino"
            element={
              <ProtectedRoute>
                <CasinoRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/casino/:game"
            element={
              <ProtectedRoute>
                <CasinoRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/live" replace />} />
        </Routes>
      </div>

      <ToastContainer />
      <style>{globalKeyframes}</style>
    </div>
  );
}

const globalKeyframes = `
  @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 8px #c8f135}50%{opacity:0.5;box-shadow:0 0 20px #c8f135} }
  @keyframes orbFloat { 0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-24px) scale(1.04)} }
  @keyframes fadeInUp { from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)} }
  @keyframes toastIn { from{opacity:0;transform:translateY(16px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes modalIn { from{opacity:0;transform:scale(0.88) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes tickerScroll { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
  @keyframes shimmer { 0%{background-position:-600px 0}100%{background-position:600px 0} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes bounce { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
  @keyframes reelBlur { 0%,100%{filter:blur(0)}50%{filter:blur(2px)} }
  @keyframes winPulse { 0%,100%{box-shadow:0 0 0 rgba(200,241,53,0)}50%{box-shadow:0 0 40px rgba(200,241,53,0.6)} }
  @keyframes jackpotFlash { 0%,100%{opacity:1}50%{opacity:0.3} }
`;

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#06080c",
    fontFamily: "'Syne', sans-serif",
    position: "relative",
    overflowX: "hidden",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
    backgroundSize: "44px 44px",
  },
  orb1: {
    position: "fixed",
    width: 500,
    height: 500,
    top: -200,
    left: -120,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(200,241,53,0.07) 0%, transparent 70%)",
    filter: "blur(60px)",
    pointerEvents: "none",
    zIndex: 0,
    animation: "orbFloat 14s ease-in-out infinite",
  },
  orb2: {
    position: "fixed",
    width: 400,
    height: 400,
    bottom: -100,
    right: -80,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)",
    filter: "blur(60px)",
    pointerEvents: "none",
    zIndex: 0,
    animation: "orbFloat 18s ease-in-out infinite reverse",
  },
  orb3: {
    position: "fixed",
    width: 350,
    height: 350,
    top: "45%",
    right: "28%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,107,43,0.04) 0%, transparent 70%)",
    filter: "blur(80px)",
    pointerEvents: "none",
    zIndex: 0,
    animation: "orbFloat 22s ease-in-out infinite 4s",
  },
};
