import React, { useState, useRef, useCallback } from "react";
import { useAppStore } from "../../store/AppStore";

const RED_NUMS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];
const NUMS = Array.from({ length: 37 }, (_, i) => i); // 0–36

function numColor(n: number): string {
  if (n === 0) return "#00aa44";
  return RED_NUMS.includes(n) ? "#cc2200" : "#111520";
}

interface Bet {
  type: string;
  label: string;
  payout: number;
  covers: number[];
}

const BET_TYPES: Bet[] = [
  { type: "red", label: "🔴 ROȘU", payout: 2, covers: RED_NUMS },
  {
    type: "black",
    label: "⚫ NEGRU",
    payout: 2,
    covers: NUMS.filter((n) => n > 0 && !RED_NUMS.includes(n)),
  },
  {
    type: "even",
    label: "PAR",
    payout: 2,
    covers: NUMS.filter((n) => n > 0 && n % 2 === 0),
  },
  {
    type: "odd",
    label: "IMPAR",
    payout: 2,
    covers: NUMS.filter((n) => n > 0 && n % 2 !== 0),
  },
  {
    type: "low",
    label: "1–18",
    payout: 2,
    covers: NUMS.filter((n) => n >= 1 && n <= 18),
  },
  {
    type: "high",
    label: "19–36",
    payout: 2,
    covers: NUMS.filter((n) => n >= 19 && n <= 36),
  },
  {
    type: "d1",
    label: "1ST 12",
    payout: 3,
    covers: NUMS.filter((n) => n >= 1 && n <= 12),
  },
  {
    type: "d2",
    label: "2ND 12",
    payout: 3,
    covers: NUMS.filter((n) => n >= 13 && n <= 24),
  },
  {
    type: "d3",
    label: "3RD 12",
    payout: 3,
    covers: NUMS.filter((n) => n >= 25 && n <= 36),
  },
];

interface PlacedBet {
  betType: string;
  amount: number;
}

export function Roulette() {
  const { state, casinoDeduct, casinoWin, showToast } = useAppStore();
  const [spinning, setSpinning] = useState(false);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [chipValue, setChipValue] = useState(10);
  const [result, setResult] = useState<number | null>(null);
  const [ballAngle, setBallAngle] = useState(0);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [winnings, setWinnings] = useState<number | null>(null);
  const [lastNumbers, setLastNumbers] = useState<number[]>([]);
  const rafRef = useRef<number>(0);

  const totalBet = placedBets.reduce((s, b) => s + b.amount, 0);

  function placeBet(betType: string) {
    if (spinning) return;
    setPlacedBets((prev) => {
      const existing = prev.find((b) => b.betType === betType);
      if (existing)
        return prev.map((b) =>
          b.betType === betType ? { ...b, amount: b.amount + chipValue } : b,
        );
      return [...prev, { betType, amount: chipValue }];
    });
  }

  function clearBets() {
    setPlacedBets([]);
  }

  const doSpin = useCallback(async () => {
    if (spinning || placedBets.length === 0) {
      showToast("⚠️ Plasează un pariu mai întâi!", "error");
      return;
    }
    if (totalBet > state.balance) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }

    const ok = await casinoDeduct(totalBet);
    if (!ok) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }
    setSpinning(true);
    setResult(null);
    setWinnings(null);

    const finalNum = Math.floor(Math.random() * 37);
    const spinDuration = 4000;
    const extraWheelTurns = 5 + Math.random() * 3;
    const extraBallTurns = 8 + Math.random() * 4;
    const startTime = performance.now();

    // Functie separata async pentru finalizarea spinului
    const finishSpin = async () => {
      setResult(finalNum);
      setLastNumbers((prev) => [finalNum, ...prev].slice(0, 10));

      let totalWin = 0;
      for (const pb of placedBets) {
        const betDef = BET_TYPES.find((b) => b.type === pb.betType);
        if (betDef && betDef.covers.includes(finalNum)) {
          totalWin += pb.amount * betDef.payout;
        }
      }
      if (totalWin > 0) {
        await casinoWin(totalWin);
        setWinnings(totalWin);
        showToast(
          `🎡 ${finalNum === 0 ? "ZERO" : finalNum}! Câștig: +${totalWin} RON`,
          "success",
        );
      } else {
        setWinnings(0);
        showToast(
          `🎡 ${finalNum === 0 ? "ZERO" : finalNum} — Niciun câștig`,
          "error",
        );
      }
      setSpinning(false);
      setPlacedBets([]);
    };

    // rAF callback — nu poate fi async, apeleaza finishSpin la final
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setWheelAngle(easeOut * extraWheelTurns * 360);
      setBallAngle(-(easeOut * extraBallTurns * 360));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        finishSpin();
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [
    spinning,
    placedBets,
    totalBet,
    state.balance,
    casinoDeduct,
    casinoWin,
    showToast,
  ]);

  // Draw wheel SVG
  const NUM_COUNT = 37;
  const RADIUS = 120;
  const CX = 140,
    CY = 140;
  const sliceAngle = 360 / NUM_COUNT;

  const wheelNums = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
  ];

  return (
    <div style={s.wrap}>
      <div style={s.arena}>
        {/* Wheel */}
        <div style={s.wheelWrap}>
          <div
            style={{ ...s.wheelOuter, transform: `rotate(${wheelAngle}deg)` }}
          >
            <svg width={280} height={280} viewBox="0 0 280 280">
              <defs>
                <radialGradient id="roulWheel" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2a1a00" />
                  <stop offset="100%" stopColor="#0d0800" />
                </radialGradient>
              </defs>
              {wheelNums.map((num, i) => {
                const startA = ((i * sliceAngle - 90) * Math.PI) / 180;
                const endA = (((i + 1) * sliceAngle - 90) * Math.PI) / 180;
                const x1 = CX + RADIUS * Math.cos(startA);
                const y1 = CY + RADIUS * Math.sin(startA);
                const x2 = CX + RADIUS * Math.cos(endA);
                const y2 = CY + RADIUS * Math.sin(endA);
                const midA = (startA + endA) / 2;
                const tx = CX + (RADIUS - 18) * Math.cos(midA);
                const ty = CY + (RADIUS - 18) * Math.sin(midA);
                const color = numColor(num);
                return (
                  <g key={num}>
                    <path
                      d={`M${CX},${CY} L${x1},${y1} A${RADIUS},${RADIUS} 0 0,1 ${x2},${y2} Z`}
                      fill={color}
                      stroke="#0a0600"
                      strokeWidth="1.5"
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#fff"
                      fontSize="8"
                      fontFamily="'Bebas Neue', cursive"
                      transform={`rotate(${i * sliceAngle + sliceAngle / 2}, ${tx}, ${ty})`}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}
              {/* Center */}
              <circle
                cx={CX}
                cy={CY}
                r={28}
                fill="#0a0600"
                stroke="rgba(255,107,43,0.3)"
                strokeWidth="2"
              />
              <text
                x={CX}
                y={CY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ff6b2b"
                fontSize="20"
                fontFamily="'Bebas Neue', cursive"
              >
                BZ
              </text>
            </svg>
          </div>

          {/* Ball */}
          <div style={{ ...s.ballTrack }}>
            <div
              style={{
                ...s.ball,
                transform: `rotate(${ballAngle}deg) translateX(110px)`,
                transition: spinning ? "none" : "transform 0.3s",
              }}
            />
          </div>

          {/* Pointer */}
          <div style={s.pointer}>▼</div>

          {/* Result */}
          {result !== null && !spinning && (
            <div
              style={{
                ...s.resultCircle,
                background: numColor(result),
                boxShadow: `0 0 20px ${numColor(result)}88`,
              }}
            >
              {result}
            </div>
          )}
        </div>

        {/* Last numbers */}
        <div style={s.lastNums}>
          <div style={s.lastNumsTitle}>ULTIMELE NUMERE</div>
          <div style={s.lastNumsList}>
            {lastNumbers.map((n, i) => (
              <div
                key={i}
                style={{
                  ...s.lastNum,
                  background: numColor(n),
                  opacity: 1 - i * 0.08,
                  fontSize: i === 0 ? 15 : 12,
                }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Betting grid */}
      <div style={s.bettingSection}>
        <div style={s.betHeader}>
          <div style={s.chipRow}>
            <span style={s.chipLabel}>JETOANE:</span>
            {[5, 10, 25, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setChipValue(v)}
                style={{
                  ...s.chip,
                  ...(chipValue === v
                    ? { ...s.chipActive, background: numColor(1) }
                    : {}),
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <div style={s.betInfo}>
            <span style={s.totalBetLabel}>PARIU TOTAL:</span>
            <span style={s.totalBetVal}>{totalBet} RON</span>
          </div>
        </div>

        {/* Outside bets */}
        <div style={s.outsideBets}>
          {BET_TYPES.map((bt) => {
            const placed = placedBets.find((b) => b.betType === bt.type);
            const isRed = bt.type === "red";
            const isBlack = bt.type === "black";
            return (
              <button
                key={bt.type}
                onClick={() => placeBet(bt.type)}
                style={{
                  ...s.betBtn,
                  background: isRed
                    ? "rgba(204,34,0,0.15)"
                    : isBlack
                      ? "rgba(17,21,32,0.8)"
                      : "rgba(255,255,255,0.04)",
                  borderColor: isRed
                    ? "rgba(204,34,0,0.4)"
                    : isBlack
                      ? "rgba(255,255,255,0.15)"
                      : placed
                        ? "#ff6b2b"
                        : "rgba(255,255,255,0.08)",
                }}
              >
                <span style={s.betBtnLabel}>{bt.label}</span>
                <span style={s.betBtnPayout}>{bt.payout}×</span>
                {placed && <span style={s.betChip}>{placed.amount}</span>}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <button
            onClick={clearBets}
            disabled={spinning || placedBets.length === 0}
            style={s.btnClear}
          >
            ȘTERGE PARIUL
          </button>
          <button
            onClick={doSpin}
            disabled={spinning || placedBets.length === 0}
            style={{
              ...s.btnSpin,
              opacity: spinning || placedBets.length === 0 ? 0.5 : 1,
            }}
          >
            {spinning ? "⏳ ROTIND..." : "🎡 ROTEȘTE ROATA!"}
          </button>
        </div>

        <div style={s.balRow}>
          <span style={s.balLbl}>SOLD:</span>
          <span style={s.balVal}>
            {state.balance.toLocaleString("ro-RO")} RON
          </span>
          {winnings !== null && winnings > 0 && (
            <span style={s.winBadge}>+{winnings} RON</span>
          )}
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
    background: "radial-gradient(ellipse at center, #1a0d00, #080400)",
    border: "3px solid rgba(255,107,43,0.2)",
    borderRadius: "20px 20px 0 0",
    padding: "24px",
    display: "flex",
    gap: 24,
    alignItems: "center",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  wheelWrap: { position: "relative", width: 280, height: 280, flexShrink: 0 },
  wheelOuter: {
    position: "absolute",
    inset: 0,
    transformOrigin: "140px 140px",
    transition: "transform 0.05s linear",
  },
  ballTrack: { position: "absolute", inset: 0, pointerEvents: "none" },
  ball: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "radial-gradient(circle at 35% 35%, #fff, #aaa)",
    boxShadow: "0 0 6px rgba(255,255,255,0.8)",
    marginTop: -7,
    marginLeft: -7,
    transformOrigin: "0 0",
  },
  pointer: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: "translateX(-50%)",
    color: "#ff6b2b",
    fontSize: 18,
    zIndex: 10,
  },
  resultCircle: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 44,
    height: 44,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    color: "#fff",
    zIndex: 20,
    border: "2px solid rgba(255,255,255,0.3)",
    animation: "fadeInUp 0.4s ease",
  },
  lastNums: { display: "flex", flexDirection: "column", gap: 8 },
  lastNumsTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 3,
    color: "#3d4660",
  },
  lastNumsList: { display: "flex", flexDirection: "column", gap: 4 },
  lastNum: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Bebas Neue', cursive",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
  },
  bettingSection: {
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderTop: "none",
    borderRadius: "0 0 16px 16px",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  betHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: 12,
  },
  chipRow: { display: "flex", alignItems: "center", gap: 8 },
  chipLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#161b2e",
    border: "2px solid rgba(255,255,255,0.1)",
    color: "#8892a4",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  chipActive: {
    borderColor: "#cc2200",
    color: "#fff",
    boxShadow: "0 0 10px rgba(204,34,0,0.4)",
  },
  betInfo: { display: "flex", alignItems: "baseline", gap: 8 },
  totalBetLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
  },
  totalBetVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    color: "#ffd23f",
  },
  outsideBets: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6,
  },
  betBtn: {
    padding: "12px 8px",
    border: "1px solid",
    borderRadius: 8,
    cursor: "pointer",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    transition: "all 0.15s",
  },
  betBtnLabel: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 16,
    color: "#f0f4ff",
    letterSpacing: 1,
  },
  betBtnPayout: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  betChip: {
    position: "absolute",
    top: -8,
    right: -8,
    background: "#ffd23f",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 12,
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { display: "flex", gap: 12 },
  btnClear: {
    flex: 0,
    padding: "12px 20px",
    background: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#3d4660",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: 1,
    cursor: "pointer",
  },
  btnSpin: {
    flex: 1,
    background: "linear-gradient(135deg, #cc2200, #880000)",
    color: "#fff",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    letterSpacing: 3,
    padding: "13px 0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(204,34,0,0.3)",
  },
  balRow: { display: "flex", alignItems: "baseline", gap: 10 },
  balLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
  },
  balVal: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    color: "#c8f135",
  },
  winBadge: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    color: "#c8f135",
    background: "rgba(200,241,53,0.1)",
    border: "1px solid rgba(200,241,53,0.3)",
    borderRadius: 6,
    padding: "2px 10px",
    animation: "fadeInUp 0.3s ease",
  },
};
