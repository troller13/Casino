import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../store/AppStore";

const TICK_MS = 50;
const GROWTH_RATE = 0.0075;
const HISTORY_MAX = 12;
const W = 520,
  H = 300;

function generateCrash(): number {
  const r = Math.random();
  if (r < 0.4) return 1.05 + Math.random() * 0.95;
  if (r < 0.65) return 2.0 + Math.random() * 3.0;
  if (r < 0.8) return 5.0 + Math.random() * 5.0;
  if (r < 0.92) return 10.0 + Math.random() * 20.0;
  return 30.0 + Math.random() * 70.0;
}

function curvePoint(progress: number): [number, number] {
  const x = progress * W * 0.88;
  const y = H - Math.pow(progress, 1.6) * H * 0.82;
  return [x, y];
}

type Phase = "waiting" | "flying" | "crashed";
interface HistoryEntry {
  mult: number;
}

export function Aviator() {
  const { state, casinoDeduct, casinoWin, saveCasinoBet, showToast } =
    useAppStore();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [betInput, setBetInput] = useState("50");
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [hasActiveBet, setHasActiveBet] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [cashoutMult, setCashoutMult] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pathPoints, setPathPoints] = useState<[number, number][]>([[0, H]]);
  const [planePos, setPlanePos] = useState<[number, number]>([0, H]);
  const [shake, setShake] = useState(false);

  // ── Game refs (mutable, no stale closure issues) ────────────────────────────
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const multRef = useRef(1.0);
  const progressRef = useRef(0);
  const crashRef = useRef(2.0);
  const hasBetRef = useRef(false);
  const cashedRef = useRef(false);
  const betAmtRef = useRef(0);
  const autoCashRef = useRef(2.0);
  const phaseRef = useRef<Phase>("waiting");

  // Keep autoCashRef in sync with state
  useEffect(() => {
    autoCashRef.current = parseFloat(autoCashout) || 2.0;
  }, [autoCashout]);

  // ── doCashout — uses only refs, never stale ─────────────────────────────────
  const doCashoutRef = useRef((m: number) => {
    if (!hasBetRef.current || cashedRef.current) return;
    cashedRef.current = true;
    hasBetRef.current = false;
    const win = parseFloat((betAmtRef.current * m).toFixed(2));
    casinoWin(win);
    saveCasinoBet("slots", betAmtRef.current, win, {
      game: "aviator",
      cashout_at: m,
    });
    showToast(`🚀 Cash out la ${m.toFixed(2)}× — +${win} MDL!`, "success");
    setCashedOut(true);
    setCashoutMult(m);
    setHasActiveBet(false);
  });

  // Keep doCashoutRef.current updated with latest store functions
  useEffect(() => {
    doCashoutRef.current = (m: number) => {
      if (!hasBetRef.current || cashedRef.current) return;
      cashedRef.current = true;
      hasBetRef.current = false;
      const win = parseFloat((betAmtRef.current * m).toFixed(2));
      casinoWin(win);
      saveCasinoBet("slots", betAmtRef.current, win, {
        game: "aviator",
        cashout_at: m,
      });
      showToast(`🚀 Cash out la ${m.toFixed(2)}× — +${win} MDL!`, "success");
      setCashedOut(true);
      setCashoutMult(m);
      setHasActiveBet(false);
    };
  }, [casinoWin, saveCasinoBet, showToast]);

  // ── startRound ──────────────────────────────────────────────────────────────
  const startRound = useRef(() => {});
  startRound.current = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (countRef.current) clearInterval(countRef.current);

    const crash = generateCrash();
    crashRef.current = crash;
    multRef.current = 1.0;
    progressRef.current = 0;
    cashedRef.current = false;
    phaseRef.current = "waiting";

    setMultiplier(1.0);
    setPathPoints([[0, H]]);
    setPlanePos([0, H]);
    setCashedOut(false);
    setCashoutMult(null);
    setCountdown(5);
    setPhase("waiting");

    let c = 5;
    countRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(countRef.current!);
        beginFlight.current();
      }
    }, 1000);
  };

  // ── beginFlight ─────────────────────────────────────────────────────────────
  const beginFlight = useRef(() => {});
  beginFlight.current = () => {
    phaseRef.current = "flying";
    setPhase("flying");

    tickRef.current = setInterval(() => {
      progressRef.current += 0.004;
      const p = Math.min(progressRef.current, 1);

      multRef.current = Math.max(
        1,
        multRef.current + multRef.current * GROWTH_RATE,
      );
      const m = parseFloat(multRef.current.toFixed(2));
      setMultiplier(m);

      const [x, y] = curvePoint(p);
      setPlanePos([x, y]);
      setPathPoints((prev) => [...prev.slice(-80), [x, y]]);

      // Auto cashout check
      if (hasBetRef.current && !cashedRef.current && m >= autoCashRef.current) {
        doCashoutRef.current(m);
      }

      // Crash check
      if (m >= crashRef.current) {
        clearInterval(tickRef.current!);
        phaseRef.current = "crashed";
        setPhase("crashed");
        setShake(true);
        setTimeout(() => setShake(false), 700);

        if (hasBetRef.current && !cashedRef.current) {
          saveCasinoBet("slots", betAmtRef.current, 0, {
            game: "aviator",
            crash_at: crashRef.current,
          });
          showToast(
            `💥 CRASH la ${crashRef.current.toFixed(2)}× — Pariu pierdut!`,
            "error",
          );
          hasBetRef.current = false;
          setHasActiveBet(false);
        }

        setHistory((prev) =>
          [{ mult: crashRef.current }, ...prev].slice(0, HISTORY_MAX),
        );
        setTimeout(() => startRound.current(), 3000);
      }
    }, TICK_MS);
  };

  // ── Cash out button handler ──────────────────────────────────────────────────
  function handleCashout() {
    if (phaseRef.current !== "flying") return;
    doCashoutRef.current(multRef.current);
  }

  // ── Place bet ────────────────────────────────────────────────────────────────
  async function handlePlaceBet() {
    if (phaseRef.current !== "waiting") {
      showToast("⚠️ Pariul se plasează în faza de așteptare!", "error");
      return;
    }
    if (hasBetRef.current) {
      showToast("⚠️ Ai deja un pariu activ!", "error");
      return;
    }
    const amt = parseFloat(betInput) || 0;
    if (amt < 1) {
      showToast("⚠️ Suma minimă 1 MDL!", "error");
      return;
    }
    if (amt > state.balance) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }

    const ok = await casinoDeduct(amt);
    if (!ok) {
      showToast("❌ Eroare la deducere!", "error");
      return;
    }

    betAmtRef.current = amt;
    setBetAmount(amt);
    hasBetRef.current = true;
    setHasActiveBet(true);
    showToast(`✅ Pariu de ${amt} MDL plasat!`, "success");
  }

  // Start on mount
  useEffect(() => {
    startRound.current();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const multColor = () => {
    if (phase === "crashed") return "#ff2d55";
    if (multiplier >= 10) return "#c8f135";
    if (multiplier >= 5) return "#ffd23f";
    if (multiplier >= 2) return "#00e5ff";
    return "#f0f4ff";
  };

  const pathD =
    pathPoints.length > 1
      ? "M " +
        pathPoints
          .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
          .join(" L ")
      : "";
  const fillD =
    pathD.length > 0
      ? pathD +
        ` L ${pathPoints[pathPoints.length - 1][0].toFixed(1)},${H} L 0,${H} Z`
      : "";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      <style>{`
        @keyframes planeBob   { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-5px)} }
        @keyframes crashShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes fadeInUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse  { 0%,100%{box-shadow:0 0 20px rgba(200,241,53,0.3)} 50%{box-shadow:0 0 40px rgba(200,241,53,0.6)} }
        @keyframes flamePulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>

      {/* Canvas */}
      <div
        style={{
          ...s.canvas,
          animation: shake ? "crashShake 0.7s ease" : "none",
        }}
      >
        {/* History */}
        <div style={s.historyRow}>
          {history.map((h, i) => (
            <div
              key={i}
              style={{
                ...s.histChip,
                color:
                  h.mult < 2 ? "#ff2d55" : h.mult < 5 ? "#00e5ff" : "#c8f135",
                background:
                  h.mult < 2
                    ? "rgba(255,45,85,0.12)"
                    : h.mult < 5
                      ? "rgba(0,229,255,0.1)"
                      : "rgba(200,241,53,0.1)",
                borderColor:
                  h.mult < 2
                    ? "rgba(255,45,85,0.25)"
                    : h.mult < 5
                      ? "rgba(0,229,255,0.2)"
                      : "rgba(200,241,53,0.25)",
              }}
            >
              {h.mult.toFixed(2)}×
            </div>
          ))}
        </div>

        {/* SVG */}
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={s.svg}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="avFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.01" />
            </linearGradient>
            <filter id="avGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={0}
              y1={H * f}
              x2={W}
              y2={H * f}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
          ))}

          {/* Fill */}
          {fillD && phase !== "waiting" && (
            <path d={fillD} fill="url(#avFill)" />
          )}

          {/* Trail */}
          {pathD && phase !== "waiting" && (
            <path
              d={pathD}
              fill="none"
              stroke={phase === "crashed" ? "#ff2d55" : "#00e5ff"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#avGlow)"
            />
          )}

          {/* Plane */}
          {phase !== "waiting" &&
            (() => {
              const [px, py] = planePos;
              return (
                <g
                  transform={`translate(${px},${py})`}
                  style={{
                    animation:
                      phase === "flying"
                        ? "planeBob 0.9s ease-in-out infinite"
                        : "none",
                  }}
                >
                  {/* Body */}
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="22"
                    ry="7"
                    fill={phase === "crashed" ? "#ff4466" : "#eef0ff"}
                  />
                  {/* Wing top */}
                  <polygon
                    points="-5,-12 12,0 -5,3"
                    fill={phase === "crashed" ? "#ff6680" : "#00e5ff"}
                    opacity="0.9"
                  />
                  {/* Tail */}
                  <polygon
                    points="-20,-7 -11,0 -20,5"
                    fill={phase === "crashed" ? "#ff6680" : "#8892a4"}
                  />
                  {/* Engine flame */}
                  {phase === "flying" && (
                    <ellipse
                      cx="-26"
                      cy="0"
                      rx="7"
                      ry="3"
                      fill="#ff6b2b"
                      style={{ animation: "flamePulse 0.25s linear infinite" }}
                    />
                  )}
                </g>
              );
            })()}

          {/* Explosion */}
          {phase === "crashed" &&
            (() => {
              const [px, py] = planePos;
              return (
                <g transform={`translate(${px},${py})`}>
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                    const r = (angle * Math.PI) / 180;
                    const len = 16 + (i % 3) * 10;
                    return (
                      <line
                        key={i}
                        x1="0"
                        y1="0"
                        x2={Math.cos(r) * len}
                        y2={Math.sin(r) * len}
                        stroke={i % 2 === 0 ? "#ff6b2b" : "#ff2d55"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    );
                  })}
                  <circle cx="0" cy="0" r="10" fill="#ff2d55" opacity="0.7" />
                  <circle
                    cx="0"
                    cy="0"
                    r="18"
                    fill="none"
                    stroke="#ff6b2b"
                    strokeWidth="1.5"
                    opacity="0.4"
                  />
                </g>
              );
            })()}
        </svg>

        {/* Multiplier overlay */}
        <div style={s.multOverlay}>
          {phase === "waiting" ? (
            <div style={{ textAlign: "center" as const }}>
              <div style={s.countLabel}>URMĂTOR ROUND</div>
              <div style={s.countNum}>{countdown}</div>
            </div>
          ) : (
            <div style={{ textAlign: "center" as const }}>
              <div
                style={{
                  ...s.multBig,
                  color: multColor(),
                  textShadow: `0 0 50px ${multColor()}66`,
                }}
              >
                {multiplier.toFixed(2)}×
              </div>
              {phase === "crashed" && (
                <div style={s.crashedLabel}>PRĂBUȘIT!</div>
              )}
              {cashedOut && cashoutMult && phase !== "crashed" && (
                <div style={s.cashoutBadge}>
                  ✅ Cash out @ {cashoutMult.toFixed(2)}×
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        {/* Bet panel */}
        <div style={s.panel}>
          <div style={s.panelTitle}>PARIU (MDL)</div>
          <div style={s.chipRow}>
            {[10, 25, 50, 100, 200].map((v) => (
              <button
                key={v}
                onClick={() => setBetInput(String(v))}
                disabled={phase === "flying" && hasActiveBet}
                style={{
                  ...s.chip,
                  ...(betInput === String(v) ? s.chipOn : {}),
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={betInput}
            onChange={(e) => setBetInput(e.target.value)}
            disabled={phase === "flying" && hasActiveBet}
            style={s.inp}
            min={1}
            placeholder="Sumă..."
          />
          <div style={s.balRow}>
            <span style={s.balLbl}>SOLD</span>
            <span style={s.balVal}>
              {state.balance.toLocaleString("ro-RO", {
                minimumFractionDigits: 2,
              })}{" "}
              MDL
            </span>
          </div>
        </div>

        {/* Action button */}
        <div style={s.actionWrap}>
          {phase === "flying" && hasActiveBet ? (
            <button onClick={handleCashout} style={s.btnCashout}>
              <span style={s.cashoutTitle}>CASH OUT</span>
              <span style={s.cashoutAmt}>
                {(betAmount * multiplier).toFixed(2)} MDL
              </span>
            </button>
          ) : (
            <button
              onClick={handlePlaceBet}
              disabled={hasActiveBet || phase === "flying"}
              style={{
                ...s.btnBet,
                opacity: hasActiveBet || phase === "flying" ? 0.5 : 1,
              }}
            >
              {hasActiveBet ? `✅ PARIAT: ${betAmount} MDL` : "🚀 PARIAZĂ"}
            </button>
          )}
        </div>

        {/* Auto cashout panel */}
        <div style={s.panel}>
          <div style={s.panelTitle}>AUTO CASH OUT LA</div>
          <div style={s.autoRow}>
            <input
              type="number"
              value={autoCashout}
              onChange={(e) => setAutoCashout(e.target.value)}
              style={{ ...s.inp, width: 72, textAlign: "center" as const }}
              min="1.10"
              step="0.10"
            />
            <span style={s.autoX}>×</span>
          </div>
          <div style={s.chipRow}>
            {[1.5, 2, 3, 5, 10].map((v) => (
              <button
                key={v}
                onClick={() => setAutoCashout(String(v))}
                style={{
                  ...s.chip,
                  ...(autoCashout === String(v) ? s.chipOn : {}),
                }}
              >
                {v}×
              </button>
            ))}
          </div>
          {betInput && autoCashout && parseFloat(betInput) > 0 && (
            <div style={s.potLabel}>
              Câștig potențial:{" "}
              <strong style={{ color: "#c8f135" }}>
                {(parseFloat(betInput) * parseFloat(autoCashout)).toFixed(2)}{" "}
                MDL
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* Crash history bar */}
      {history.length > 0 && (
        <div style={s.histBar}>
          <span style={s.histBarLabel}>ULTIMELE CRASH-URI:</span>
          {history.map((h, i) => (
            <span
              key={i}
              style={{
                ...s.histBarItem,
                color:
                  h.mult < 2 ? "#ff2d55" : h.mult < 5 ? "#00e5ff" : "#c8f135",
              }}
            >
              {h.mult.toFixed(2)}×
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    maxWidth: 680,
    margin: "0 auto",
  },

  canvas: {
    background: "linear-gradient(180deg, #030609 0%, #060c18 100%)",
    borderRadius: "20px 20px 0 0",
    border: "2px solid rgba(0,229,255,0.12)",
    position: "relative",
    overflow: "hidden",
    minHeight: 340,
  },

  historyRow: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    zIndex: 5,
    display: "flex",
    gap: 4,
    flexWrap: "wrap" as const,
  },
  histChip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.5,
    padding: "2px 7px",
    borderRadius: 10,
    border: "1px solid",
  },

  svg: { display: "block", width: "100%" },

  multOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  countLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: 3,
    color: "#3d4660",
    marginBottom: 4,
  },
  countNum: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 88,
    color: "#3d4660",
    lineHeight: "1",
  },
  multBig: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 76,
    letterSpacing: 2,
    lineHeight: "1",
    transition: "color 0.2s",
  },
  crashedLabel: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    letterSpacing: 5,
    color: "#ff2d55",
    animation: "fadeInUp 0.3s ease",
  },
  cashoutBadge: {
    display: "inline-block",
    marginTop: 8,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#c8f135",
    background: "rgba(200,241,53,0.1)",
    border: "1px solid rgba(200,241,53,0.25)",
    borderRadius: 6,
    padding: "4px 12px",
    animation: "fadeInUp 0.3s ease",
  },

  controls: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderTop: "none",
    borderRadius: "0 0 16px 16px",
    padding: "18px 20px",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 16,
    alignItems: "start",
  },

  panel: { display: "flex", flexDirection: "column", gap: 8 },
  panelTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 3,
    color: "#3d4660",
  },
  chipRow: { display: "flex", gap: 5, flexWrap: "wrap" as const },
  chip: {
    flex: "1 1 auto",
    minWidth: 34,
    padding: "6px 2px",
    background: "#161b2e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#8892a4",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  chipOn: {
    borderColor: "#00e5ff",
    color: "#00e5ff",
    background: "rgba(0,229,255,0.1)",
  },
  inp: {
    width: "100%",
    background: "#080a0f",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#f0f4ff",
    padding: "9px 12px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  },
  balRow: { display: "flex", alignItems: "baseline", gap: 6 },
  balLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    color: "#3d4660",
  },
  balVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 17,
    color: "#c8f135",
  },

  actionWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 160,
  },
  btnBet: {
    width: "100%",
    height: 84,
    background: "linear-gradient(135deg, #00e5ff, #0088aa)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    letterSpacing: 2,
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(0,229,255,0.2)",
    transition: "all 0.15s",
  },
  btnCashout: {
    width: "100%",
    height: 84,
    background: "linear-gradient(135deg, #c8f135, #a0cc00)",
    color: "#06080c",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    animation: "glowPulse 1s ease-in-out infinite",
    boxShadow: "0 4px 24px rgba(200,241,53,0.4)",
  },
  cashoutTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    letterSpacing: 3,
    color: "#06080c",
  },
  cashoutAmt: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    color: "#06080c",
  },

  autoRow: { display: "flex", alignItems: "center", gap: 6 },
  autoX: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    color: "#8892a4",
  },
  potLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },

  histBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    background: "#080a0f",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: "0 0 12px 12px",
    flexWrap: "wrap" as const,
  },
  histBarLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    color: "#252c40",
    flexShrink: 0,
  },
  histBarItem: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 14,
  },
};
