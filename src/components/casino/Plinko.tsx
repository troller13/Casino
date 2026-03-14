import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "../../store/AppStore";

const ROWS = 10;
const PEG_SPACING = 44;
const BALL_R = 8;
const COLS = ROWS + 1; // bucket count = ROWS + 1

const MULTIPLIERS = [10, 4, 2, 1.5, 1, 0.5, 1, 1.5, 2, 4, 10];
const MULT_COLORS = [
  "#c8f135",
  "#ffd23f",
  "#ff6b2b",
  "#ff9944",
  "#8892a4",
  "#3d4660",
  "#8892a4",
  "#ff9944",
  "#ff6b2b",
  "#ffd23f",
  "#c8f135",
];

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  row: number;
  done: boolean;
  bucket: number;
  trail: { x: number; y: number }[];
}

function getPegPos(row: number, col: number): { x: number; y: number } {
  const totalW = 440;
  const pegsInRow = row + 1;
  const startX = totalW / 2 - ((pegsInRow - 1) * PEG_SPACING) / 2;
  return {
    x: startX + col * PEG_SPACING,
    y: 60 + row * PEG_SPACING,
  };
}

export function Plinko() {
  const { state, casinoDeduct, casinoWin, showToast } = useAppStore();
  const [bet, setBet] = useState(10);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [bucketFlash, setBucketFlash] = useState<number | null>(null);
  const [lastResults, setLastResults] = useState<
    { bucket: number; mult: number }[]
  >([]);
  const rafRef = useRef<number>(0);
  const ballIdRef = useRef(0);
  const activeBalls = useRef<Ball[]>([]);

  const dropBall = useCallback(async () => {
    if (bet > state.balance) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }
    const ok = await casinoDeduct(bet);
    if (!ok) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }

    const id = ++ballIdRef.current;
    const ball: Ball = {
      id,
      x: 220,
      y: 10,
      vx: 0,
      vy: 2,
      row: -1,
      done: false,
      bucket: -1,
      trail: [],
    };
    activeBalls.current = [...activeBalls.current, ball];
    setBalls((prev) => [...prev, ball]);
  }, [bet, state.balance, casinoDeduct, showToast]);

  useEffect(() => {
    const tick = () => {
      if (activeBalls.current.length === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      activeBalls.current = activeBalls.current.map((ball) => {
        if (ball.done) return ball;

        const nb = {
          ...ball,
          trail: [...ball.trail.slice(-8), { x: ball.x, y: ball.y }],
        };
        nb.y += nb.vy;
        nb.x += nb.vx;
        nb.vy = Math.min(nb.vy + 0.25, 6);
        nb.vx *= 0.96;

        // Check peg collisions
        for (let row = 0; row <= ROWS - 1; row++) {
          for (let col = 0; col <= row; col++) {
            const peg = getPegPos(row, col);
            const dx = nb.x - peg.x;
            const dy = nb.y - peg.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BALL_R + 5) {
              nb.vy = Math.abs(nb.vy) * 0.6 + 1.5;
              nb.vx =
                dx > 0
                  ? Math.abs(nb.vx) * 0.8 + 1.2
                  : -(Math.abs(nb.vx) * 0.8 + 1.2);
              nb.vx += (Math.random() - 0.5) * 1.5;
              nb.y = peg.y + (BALL_R + 6);
              nb.row = row;
            }
          }
        }

        // Clamp to board
        nb.x = Math.max(20, Math.min(420, nb.x));

        // Reached bottom
        if (nb.y > 520) {
          const bIdx = Math.round((nb.x - 20) / (400 / COLS));
          const bucket = Math.max(0, Math.min(COLS - 1, bIdx));
          nb.done = true;
          nb.bucket = bucket;
          const mult = MULTIPLIERS[bucket];
          const win = Math.floor(bet * mult);
          casinoWin(win); // fire and forget - plinko e async oricum
          setLastResults((prev) => [{ bucket, mult }, ...prev].slice(0, 8));
          setBucketFlash(bucket);
          setTimeout(() => setBucketFlash(null), 600);
          if (mult >= 2) showToast(`🎯 ${mult}× — +${win} RON!`, "success");
          else showToast(`${mult}× — +${win} RON`, "info");
        }

        return nb;
      });

      // Cleanup done balls after a short delay
      setBalls([...activeBalls.current]);
      activeBalls.current = activeBalls.current.filter(
        (b) => !b.done || b.trail.length > 0,
      );

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [bet, casinoWin, showToast]);

  const totalW = 440,
    totalH = 560;

  return (
    <div style={s.wrap}>
      <div style={s.arena}>
        <div style={s.arenaTitle}>🎯 PLINKO</div>

        <svg
          width={totalW}
          height={totalH}
          style={{ display: "block", margin: "0 auto" }}
        >
          <defs>
            <radialGradient id="ballGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#c8f135" />
              <stop offset="100%" stopColor="#6a8000" />
            </radialGradient>
          </defs>

          {/* Background lanes */}
          {Array.from({ length: COLS }).map((_, i) => {
            const x = 20 + i * (400 / COLS);
            const w = 400 / COLS;
            const isFlash = bucketFlash === i;
            return (
              <rect
                key={i}
                x={x}
                y={460}
                width={w - 2}
                height={60}
                fill={isFlash ? MULT_COLORS[i] : `${MULT_COLORS[i]}18`}
                rx={4}
                style={{ transition: "fill 0.2s" }}
              />
            );
          })}

          {/* Pegs */}
          {Array.from({ length: ROWS }).map((_, row) =>
            Array.from({ length: row + 1 }).map((_, col) => {
              const { x, y } = getPegPos(row, col);
              return (
                <circle
                  key={`${row}-${col}`}
                  cx={x}
                  cy={y}
                  r={5}
                  fill="#8892a4"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                />
              );
            }),
          )}

          {/* Ball trails */}
          {balls.map((ball) =>
            ball.trail.map((pt, i) => (
              <circle
                key={`${ball.id}-t${i}`}
                cx={pt.x}
                cy={pt.y}
                r={BALL_R * (i / ball.trail.length) * 0.6}
                fill="#c8f135"
                opacity={(i / ball.trail.length) * 0.35}
              />
            )),
          )}

          {/* Balls */}
          {balls
            .filter((b) => !b.done)
            .map((ball) => (
              <circle
                key={ball.id}
                cx={ball.x}
                cy={ball.y}
                r={BALL_R}
                fill="url(#ballGrad)"
                stroke="rgba(200,241,53,0.4)"
                strokeWidth="1"
                style={{ filter: "drop-shadow(0 0 4px rgba(200,241,53,0.5))" }}
              />
            ))}

          {/* Bucket labels */}
          {Array.from({ length: COLS }).map((_, i) => {
            const x = 20 + i * (400 / COLS) + 400 / COLS / 2 - 1;
            return (
              <text
                key={i}
                x={x}
                y={494}
                textAnchor="middle"
                fill={MULT_COLORS[i]}
                fontSize="11"
                fontFamily="'Bebas Neue', cursive"
                letterSpacing="0.5"
              >
                {MULTIPLIERS[i]}×
              </text>
            );
          })}
        </svg>
      </div>

      <div style={s.controls}>
        <div style={s.topRow}>
          <div>
            <div style={s.lbl}>SOLD</div>
            <div style={s.val}>{state.balance.toLocaleString("ro-RO")} RON</div>
          </div>
          <div>
            <div style={s.lbl}>PARIU</div>
            <div style={s.betBtns}>
              {[5, 10, 25, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setBet(v)}
                  style={{ ...s.betBtn, ...(bet === v ? s.betBtnOn : {}) }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={dropBall} style={s.btnDrop}>
          🎯 ARUNCĂ BILA — {bet} RON
        </button>

        {lastResults.length > 0 && (
          <div style={s.history}>
            <span style={s.lbl}>ULTIMELE: </span>
            {lastResults.map((r, i) => (
              <span
                key={i}
                style={{ ...s.histItem, color: MULT_COLORS[r.bucket] }}
              >
                {r.mult}×
              </span>
            ))}
          </div>
        )}

        <div style={s.payRow}>
          {MULTIPLIERS.map((m, i) => (
            <div
              key={i}
              style={{ ...s.payCell, borderColor: `${MULT_COLORS[i]}44` }}
            >
              <span
                style={{
                  color: MULT_COLORS[i],
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 13,
                }}
              >
                {m}×
              </span>
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
  arena: {
    background: "radial-gradient(ellipse at 50% 20%, #0d1a00, #06080c)",
    border: "3px solid rgba(200,241,53,0.15)",
    borderRadius: "20px 20px 0 0",
    padding: "20px 16px",
  },
  arenaTitle: {
    textAlign: "center",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 13,
    letterSpacing: 6,
    color: "rgba(200,241,53,0.3)",
    marginBottom: 12,
  },
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
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
    flexWrap: "wrap" as const,
  },
  lbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    color: "#3d4660",
    marginBottom: 4,
  },
  val: { fontFamily: "'Bebas Neue', cursive", fontSize: 22, color: "#c8f135" },
  betBtns: { display: "flex", gap: 6 },
  betBtn: {
    padding: "7px 12px",
    background: "#161b2e",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#8892a4",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 15,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  betBtnOn: {
    borderColor: "#c8f135",
    color: "#c8f135",
    background: "rgba(200,241,53,0.08)",
  },
  btnDrop: {
    width: "100%",
    background: "linear-gradient(135deg, #c8f135, #a8d400)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    letterSpacing: 3,
    padding: "13px 0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  history: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  histItem: { fontFamily: "'Bebas Neue', cursive", fontSize: 16 },
  payRow: { display: "flex", gap: 4, justifyContent: "center" },
  payCell: {
    flex: 1,
    padding: "5px 2px",
    border: "1px solid",
    borderRadius: 4,
    textAlign: "center" as const,
    background: "rgba(255,255,255,0.02)",
  },
};
