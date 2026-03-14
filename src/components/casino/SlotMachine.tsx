import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "../../store/AppStore";

interface Symbol {
  emoji: string;
  name: string;
  mult: number;
  color: string;
}

const SYMBOLS: Symbol[] = [
  { emoji: "🎰", name: "JACKPOT", mult: 100, color: "#c8f135" },
  { emoji: "7️⃣", name: "SEVEN", mult: 50, color: "#ff2d55" },
  { emoji: "💎", name: "DIAMOND", mult: 20, color: "#00e5ff" },
  { emoji: "⭐", name: "STAR", mult: 15, color: "#ffd23f" },
  { emoji: "🍀", name: "CLOVER", mult: 12, color: "#00cc66" },
  { emoji: "🔔", name: "BELL", mult: 8, color: "#ffd23f" },
  { emoji: "🍒", name: "CHERRY", mult: 5, color: "#ff6b2b" },
  { emoji: "🍇", name: "GRAPE", mult: 4, color: "#cc44ff" },
  { emoji: "🍋", name: "LEMON", mult: 3, color: "#ffd23f" },
];
// Weights — jackpot & 7 are rare
const WEIGHTS = [1, 2, 5, 7, 8, 10, 15, 16, 18];

function weightedRandom(): Symbol {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

// Generate a tall strip for one reel (30 symbols)
function makeStrip(): Symbol[] {
  return Array.from({ length: 30 }, () => weightedRandom());
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

export function SlotMachine() {
  const { state, casinoDeduct, casinoWin, showToast } = useAppStore();
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  // Each reel has a strip + current offset (in symbol units)
  const [strips] = useState<Symbol[][]>(() => [
    makeStrip(),
    makeStrip(),
    makeStrip(),
  ]);
  const [offsets, setOffsets] = useState([0, 0, 0]); // display offset in px
  const [finalSymbols, setFinalSymbols] = useState<Symbol[]>(() => [
    strips[0][0],
    strips[1][0],
    strips[2][0],
  ]);
  const [winResult, setWinResult] = useState<{
    mult: number;
    message: string;
    color: string;
  } | null>(null);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [winFlash, setWinFlash] = useState(false);
  const [reelDone, setReelDone] = useState([true, true, true]);
  const rafRefs = useRef<number[]>([]);
  const particleRaf = useRef<number>(0);

  // Particle system
  const spawnParticles = useCallback((count: number) => {
    const colors = [
      "#c8f135",
      "#ffd23f",
      "#ff6b2b",
      "#00e5ff",
      "#ff2d55",
      "#cc44ff",
    ];
    const newP: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: 40 + Math.random() * 320,
      y: 200,
      vx: (Math.random() - 0.5) * 8,
      vy: -(4 + Math.random() * 8),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
      life: 1,
    }));
    setParticles((prev) => [...prev, ...newP]);
  }, []);

  useEffect(() => {
    if (particles.length === 0) return;
    const tick = () => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.3,
            life: p.life - 0.025,
          }))
          .filter((p) => p.life > 0);
        return next;
      });
      if (particles.length > 0)
        particleRaf.current = requestAnimationFrame(tick);
    };
    particleRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(particleRaf.current);
  }, [particles.length]);

  const SYM_H = 90; // px per symbol

  function spinReel(
    reelIdx: number,
    duration: number,
    finalSym: Symbol,
    strip: Symbol[],
  ) {
    return new Promise<void>((resolve) => {
      const totalDistance = 20 * SYM_H + Math.random() * 5 * SYM_H; // at least 20 symbols scroll
      const startTime = performance.now();

      setReelDone((prev) => {
        const n = [...prev];
        n[reelIdx] = false;
        return n;
      });

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease: fast in middle, decelerate at end
        const eased =
          progress < 0.7
            ? progress / 0.7
            : 1 - Math.pow((progress - 0.7) / 0.3, 2);
        const currentDist =
          totalDistance * (progress < 0.7 ? eased * 0.8 : 0.8 + eased * 0.2);

        setOffsets((prev) => {
          const n = [...prev];
          n[reelIdx] = currentDist % (strip.length * SYM_H);
          return n;
        });

        if (progress < 1) {
          rafRefs.current[reelIdx] = requestAnimationFrame(animate);
        } else {
          setReelDone((prev) => {
            const n = [...prev];
            n[reelIdx] = true;
            return n;
          });
          resolve();
        }
      };
      rafRefs.current[reelIdx] = requestAnimationFrame(animate);
    });
  }

  const spin = useCallback(async () => {
    if (spinning) return;
    if (bet > state.balance) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }

    setWinResult(null);
    setLastWin(null);
    setWinFlash(false);
    setParticles([]);
    const ok = await casinoDeduct(bet);
    if (!ok) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }
    setSpinning(true);

    // Determine final symbols for each reel
    const finals = [weightedRandom(), weightedRandom(), weightedRandom()];
    setFinalSymbols(finals);

    const durations = [900, 1300, 1700];

    await Promise.all(
      durations.map((dur, i) => spinReel(i, dur, finals[i], strips[i])),
    );

    // Evaluate result
    const [s0, s1, s2] = finals;
    let mult = 0,
      message = "",
      color = "#f0f4ff";

    if (s0.name === s1.name && s1.name === s2.name) {
      mult = s0.mult;
      message = `3× ${s0.name}!`;
      color = s0.color;
    } else if (
      s0.name === s1.name ||
      s1.name === s2.name ||
      s0.name === s2.name
    ) {
      const sym = s0.name === s1.name ? s0 : s1.name === s2.name ? s1 : s0;
      mult = Math.max(1, Math.floor(sym.mult / 6));
      message = `2× ${sym.name}`;
      color = sym.color;
    } else {
      const cherries = finals.filter((s) => s.name === "CHERRY").length;
      if (cherries > 0) {
        mult = cherries;
        message = `${cherries}× CHERRY`;
        color = "#ff6b2b";
      }
    }

    if (mult > 0) {
      const winAmt = bet * mult;
      await casinoWin(winAmt);
      setLastWin(winAmt);
      setWinResult({ mult, message, color });
      setWinFlash(true);
      setTimeout(() => setWinFlash(false), 1000);
      spawnParticles(mult >= 10 ? 80 : mult >= 5 ? 50 : 25);
      showToast(`🎰 ${message} — +${winAmt} RON!`, "success");
    } else {
      showToast("Încearcă din nou!", "info");
    }

    setSpinning(false);
  }, [
    spinning,
    bet,
    state.balance,
    strips,
    casinoDeduct,
    casinoWin,
    showToast,
    spawnParticles,
  ]);

  // Visible symbols for a reel (3 visible, center is payline)
  function getVisibleSymbols(reelIdx: number): Symbol[] {
    const strip = strips[reelIdx];
    const offset = offsets[reelIdx];
    const symIdx = Math.floor(offset / SYM_H) % strip.length;
    return [
      strip[(symIdx - 1 + strip.length) % strip.length],
      strip[symIdx],
      strip[(symIdx + 1) % strip.length],
    ];
  }

  const isWin = winResult !== null;

  return (
    <div style={s.wrap}>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes reelBlur { 0%,100%{filter:blur(0)} 50%{filter:blur(2px)} }
        @keyframes winPulse { 0%,100%{box-shadow:0 0 0 rgba(200,241,53,0)} 50%{box-shadow:0 0 40px rgba(200,241,53,0.6)} }
        @keyframes jackpotFlash { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes shimmerWin { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      <div
        style={{
          ...s.machine,
          ...(winFlash
            ? {
                animation: "winPulse 0.5s ease 2",
                borderColor: winResult?.color ?? "#c8f135",
              }
            : {}),
        }}
      >
        {/* Top jackpot display */}
        <div style={s.jackpotBar}>
          <span style={s.jackpotLabel}>JACKPOT</span>
          <span
            style={{
              ...s.jackpotVal,
              animation:
                isWin && winResult?.mult === 100
                  ? "jackpotFlash 0.3s infinite"
                  : "none",
            }}
          >
            {(bet * 100).toLocaleString("ro-RO")} RON
          </span>
        </div>

        {/* Reel window */}
        <div style={s.reelWindow}>
          {/* Particle canvas overlay */}
          <div style={s.particleLayer}>
            {particles.map((p) => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: p.x,
                  top: p.y,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  background: p.color,
                  opacity: p.life,
                  pointerEvents: "none",
                  boxShadow: `0 0 ${p.size}px ${p.color}`,
                }}
              />
            ))}
          </div>

          {/* Payline glow */}
          <div
            style={{
              ...s.paylineGlow,
              opacity: isWin ? 1 : 0.3,
              background: isWin
                ? `linear-gradient(90deg, transparent, ${winResult?.color ?? "#c8f135"}44, transparent)`
                : "linear-gradient(90deg, transparent, rgba(200,241,53,0.15), transparent)",
            }}
          />

          {/* Top & bottom fade */}
          <div style={s.fadeTop} />
          <div style={s.fadeBot} />

          {/* Reels */}
          <div style={s.reelsRow}>
            {[0, 1, 2].map((ri) => {
              const visible =
                spinning || !reelDone[ri]
                  ? getVisibleSymbols(ri)
                  : [
                      SYMBOLS.find((s) => s.name !== finalSymbols[ri].name) ||
                        SYMBOLS[7],
                      finalSymbols[ri],
                      SYMBOLS.find((s) => s.name !== finalSymbols[ri].name) ||
                        SYMBOLS[8],
                    ];
              const isThisReelWin =
                isWin &&
                finalSymbols[ri].name === winResult?.message.split("× ")[1];
              return (
                <div key={ri} style={s.reel}>
                  <div
                    style={{
                      ...s.reelInner,
                      transition:
                        reelDone[ri] && !spinning ? "transform 0.1s" : "none",
                      animation:
                        spinning && !reelDone[ri]
                          ? "reelBlur 0.15s linear infinite"
                          : "none",
                    }}
                  >
                    {visible.map((sym, si) => (
                      <div
                        key={si}
                        style={{
                          ...s.symbol,
                          ...(si === 1 ? s.symbolCenter : {}),
                          ...(si === 1 && isThisReelWin
                            ? {
                                background: `radial-gradient(circle, ${sym.color}22, transparent)`,
                                animation: "bounce 0.5s ease infinite",
                              }
                            : {}),
                        }}
                      >
                        <span
                          style={{
                            fontSize: si === 1 ? 46 : 34,
                            filter: si !== 1 ? "brightness(0.5)" : "none",
                            transition: "all 0.2s",
                          }}
                        >
                          {sym.emoji}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Reel separator */}
                  {ri < 2 && <div style={s.reelSep} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Win message */}
        <div
          style={{
            ...s.winBar,
            opacity: winResult ? 1 : 0,
            transform: winResult ? "scale(1)" : "scale(0.8)",
          }}
        >
          {winResult && (
            <>
              <span style={{ ...s.winMsg, color: winResult.color }}>
                {winResult.message}
              </span>
              <span style={{ ...s.winAmt, color: winResult.color }}>
                +{lastWin} RON
              </span>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <div style={s.statsRow}>
          <div>
            <div style={s.statLbl}>SOLD</div>
            <div style={s.statVal}>
              {state.balance.toLocaleString("ro-RO")} RON
            </div>
          </div>
          {lastWin !== null && lastWin > 0 && (
            <div>
              <div style={s.statLbl}>ULTIMUL CÂȘTIG</div>
              <div style={{ ...s.statVal, color: "#c8f135" }}>
                +{lastWin} RON
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={s.betLbl}>PARIU</div>
          <div style={s.betRow}>
            {[5, 10, 25, 50, 100, 200].map((v) => (
              <button
                key={v}
                disabled={spinning}
                onClick={() => setBet(v)}
                style={{ ...s.betBtn, ...(bet === v ? s.betBtnOn : {}) }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={spin}
          disabled={spinning}
          style={{
            ...s.btnSpin,
            background: spinning
              ? "linear-gradient(135deg, #444, #333)"
              : "linear-gradient(135deg, #ff6b2b, #c44000)",
          }}
        >
          {spinning ? "⏳ ROTIND..." : "🎰 ROTEȘTE!"}
        </button>

        <div style={s.bottomRow}>
          <button
            disabled={spinning}
            onClick={() => setBet(Math.min(200, state.balance))}
            style={s.btnMax}
          >
            MAX BET
          </button>
          <button
            disabled={spinning}
            onClick={() => setBet(Math.max(5, Math.floor(bet / 2)))}
            style={s.btnHalf}
          >
            ½
          </button>
          <button
            disabled={spinning}
            onClick={() => setBet(Math.min(200, bet * 2))}
            style={s.btnDouble}
          >
            ×2
          </button>
          <span style={s.rtp}>RTP 96% · Linie centrală</span>
        </div>
      </div>

      {/* Paytable */}
      <div style={s.paytable}>
        <div style={s.ptTitle}>TABLE DE PLATĂ — 3× SIMBOL</div>
        <div style={s.ptGrid}>
          {SYMBOLS.map((sym) => (
            <div key={sym.name} style={s.ptRow}>
              <span style={{ fontSize: 20 }}>
                {sym.emoji}
                {sym.emoji}
                {sym.emoji}
              </span>
              <span style={{ ...s.ptMult, color: sym.color }}>{sym.mult}×</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    maxWidth: 680,
    margin: "0 auto",
  },
  machine: {
    background: "linear-gradient(180deg, #1a0800 0%, #0a0400 100%)",
    border: "3px solid rgba(255,107,43,0.3)",
    borderRadius: "20px 20px 0 0",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "inset 0 0 80px rgba(0,0,0,0.5)",
    transition: "border-color 0.3s, box-shadow 0.3s",
  },
  jackpotBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(0,0,0,0.4)",
    borderRadius: 8,
    padding: "8px 16px",
    border: "1px solid rgba(255,107,43,0.2)",
  },
  jackpotLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 3,
    color: "#ff6b2b",
  },
  jackpotVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    color: "#ffd23f",
    letterSpacing: 2,
  },
  reelWindow: {
    background: "#06080c",
    border: "2px solid rgba(255,107,43,0.25)",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    height: 270,
  },
  particleLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    pointerEvents: "none",
    overflow: "hidden",
  },
  paylineGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    height: 90,
    zIndex: 1,
    pointerEvents: "none",
    transition: "all 0.4s ease",
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    background: "linear-gradient(to bottom, #06080c, transparent)",
    zIndex: 3,
    pointerEvents: "none",
  },
  fadeBot: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    background: "linear-gradient(to top, #06080c, transparent)",
    zIndex: 3,
    pointerEvents: "none",
  },
  reelsRow: {
    display: "flex",
    height: "100%",
    position: "relative",
    zIndex: 2,
  },
  reel: { flex: 1, position: "relative", overflow: "hidden" },
  reelInner: { display: "flex", flexDirection: "column" },
  reelSep: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 1,
    background: "rgba(255,107,43,0.15)",
    zIndex: 4,
  },
  symbol: {
    height: 90,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },
  symbolCenter: { background: "rgba(255,255,255,0.02)" },
  winBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
    padding: "0 4px",
    transition: "all 0.35s cubic-bezier(0.23,1,0.32,1)",
  },
  winMsg: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 26,
    letterSpacing: 2,
  },
  winAmt: { fontFamily: "'Bebas Neue', cursive", fontSize: 30 },
  controls: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderTop: "none",
    borderRadius: "0 0 16px 16px",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  statsRow: { display: "flex", gap: 32, alignItems: "flex-end" },
  statLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    color: "#3d4660",
  },
  statVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    color: "#c8f135",
  },
  betLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
    marginBottom: 8,
  },
  betRow: { display: "flex", gap: 6 },
  betBtn: {
    flex: 1,
    padding: "9px 4px",
    background: "#161b2e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#8892a4",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  betBtnOn: {
    borderColor: "#ff6b2b",
    color: "#ff6b2b",
    background: "rgba(255,107,43,0.1)",
    boxShadow: "0 0 10px rgba(255,107,43,0.2)",
  },
  btnSpin: {
    width: "100%",
    color: "#fff",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 24,
    letterSpacing: 4,
    padding: "14px 0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(255,107,43,0.3)",
    transition: "background 0.3s",
  },
  bottomRow: { display: "flex", alignItems: "center", gap: 8 },
  btnMax: {
    background: "rgba(255,107,43,0.1)",
    border: "1px solid rgba(255,107,43,0.3)",
    borderRadius: 6,
    color: "#ff6b2b",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: 1,
    padding: "6px 12px",
    cursor: "pointer",
  },
  btnHalf: {
    background: "#161b2e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#8892a4",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    padding: "5px 14px",
    cursor: "pointer",
  },
  btnDouble: {
    background: "#161b2e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#8892a4",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    padding: "5px 14px",
    cursor: "pointer",
  },
  rtp: {
    marginLeft: "auto",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#252c40",
  },
  paytable: {
    background: "#080a0f",
    border: "1px solid rgba(255,255,255,0.04)",
    borderRadius: "0 0 16px 16px",
    padding: "14px 20px",
  },
  ptTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 3,
    color: "#3d4660",
    marginBottom: 10,
  },
  ptGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 },
  ptRow: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    alignItems: "center",
    background: "#0d1017",
    borderRadius: 6,
    padding: "7px 4px",
  },
  ptMult: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    letterSpacing: 1,
  },
};
