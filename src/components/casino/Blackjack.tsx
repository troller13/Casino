import React, { useState, useCallback } from "react";
import { useAppStore } from "../../store/AppStore";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";
type GamePhase = "betting" | "playing" | "dealer" | "result";
type GameResult = "player" | "dealer" | "push" | "blackjack" | null;

interface Card {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ suit, rank });
  return deck;
}
function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function cardValue(rank: Rank): number {
  if (["J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank);
}
function handValue(hand: Card[]): number {
  let total = 0,
    aces = 0;
  for (const c of hand) {
    if (c.hidden) continue;
    total += cardValue(c.rank);
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}
function isRed(suit: Suit) {
  return suit === "♥" || suit === "♦";
}

export function Blackjack() {
  const { state, casinoDeduct, casinoWin, showToast } = useAppStore();
  const [deck, setDeck] = useState<Card[]>(() =>
    shuffle([...buildDeck(), ...buildDeck()]),
  );
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [result, setResult] = useState<GameResult>(null);
  const [bet, setBet] = useState(50);
  const [betInput, setBetInput] = useState("50");
  const [lastWin, setLastWin] = useState<number | null>(null);

  const replenish = useCallback(
    (d: Card[]) =>
      d.length < 20 ? shuffle([...buildDeck(), ...buildDeck()]) : d,
    [],
  );

  async function dealGame() {
    const betAmt = parseInt(betInput) || 50;
    if (betAmt < 1 || betAmt > state.balance) {
      showToast("⚠️ Sumă invalidă!", "error");
      return;
    }
    const ok = await casinoDeduct(betAmt);
    if (!ok) {
      showToast("❌ Sold insuficient!", "error");
      return;
    }
    setBet(betAmt);
    setLastWin(null);
    const fresh = replenish(deck);
    const p: Card[] = [fresh[0], fresh[2]];
    const d: Card[] = [fresh[1], { ...fresh[3], hidden: true }];
    setDeck(fresh.slice(4));
    setPlayerHand(p);
    setDealerHand(d);
    setResult(null);
    if (handValue(p) === 21) {
      const revealed = [fresh[1], fresh[3]];
      setDealerHand(revealed);
      finishGame(handValue(revealed) === 21 ? "push" : "blackjack", betAmt);
    } else {
      setPhase("playing");
    }
  }

  function hit() {
    const newCard = deck[0];
    const newHand = [...playerHand, newCard];
    setDeck(deck.slice(1));
    setPlayerHand(newHand);
    const val = handValue(newHand);
    if (val > 21) {
      setDealerHand((dh) => dh.map((c) => ({ ...c, hidden: false })));
      finishGame("dealer", bet);
    } else if (val === 21) {
      standWith(newHand, deck.slice(1));
    }
  }

  function stand() {
    standWith(playerHand, deck);
  }

  function standWith(ph: Card[], deckNow: Card[]) {
    setPhase("dealer");
    let cur = dealerHand.map((c) => ({ ...c, hidden: false }));
    let d = [...deckNow];
    while (handValue(cur) < 17) {
      cur = [...cur, d[0]];
      d = d.slice(1);
    }
    setDeck(d);
    setTimeout(() => {
      setDealerHand(cur);
      const pv = handValue(ph),
        dv = handValue(cur);
      finishGame(
        dv > 21 || pv > dv ? "player" : dv > pv ? "dealer" : "push",
        bet,
      );
    }, 700);
  }

  async function finishGame(res: GameResult, betAmt: number) {
    setResult(res);
    setPhase("result");
    let win = 0;
    if (res === "blackjack") win = Math.floor(betAmt * 2.5);
    else if (res === "player") win = betAmt * 2;
    else if (res === "push") win = betAmt;
    if (win > 0) await casinoWin(win);
    setLastWin(win);
    if (res === "blackjack")
      showToast(`🃏 BLACKJACK! +${Math.floor(betAmt * 1.5)} RON`, "success");
    else if (res === "player")
      showToast(`✅ Câștigat! +${betAmt} RON`, "success");
    else if (res === "push") showToast("🤝 Egalitate — pariu returnat", "info");
    else showToast("❌ Dealer câștigă", "error");
  }

  function newGame() {
    setPhase("betting");
    setPlayerHand([]);
    setDealerHand([]);
    setResult(null);
    setLastWin(null);
  }

  const pv = handValue(playerHand);
  const dv = handValue(dealerHand);

  return (
    <div style={s.wrap}>
      <div style={s.table}>
        <div style={s.tableLogo}>✦ BETZONE BLACKJACK ✦</div>
        <div style={s.area}>
          <div style={s.areaLabel}>
            DEALER {phase !== "betting" && phase !== "playing" ? `— ${dv}` : ""}
          </div>
          <div style={s.hand}>
            {dealerHand.length === 0 && <div style={s.emptyHand}>Dealer</div>}
            {dealerHand.map((c, i) => (
              <CardEl key={i} card={c} delay={i * 150} />
            ))}
          </div>
        </div>
        <div style={s.divider} />
        {result && (
          <div
            style={{
              ...s.resultBanner,
              background:
                result === "dealer"
                  ? "rgba(255,45,85,0.15)"
                  : result === "push"
                    ? "rgba(255,210,63,0.12)"
                    : "rgba(200,241,53,0.15)",
              borderColor:
                result === "dealer"
                  ? "#ff2d55"
                  : result === "push"
                    ? "#ffd23f"
                    : "#c8f135",
            }}
          >
            <span style={s.resultText}>
              {result === "blackjack"
                ? "🃏 BLACKJACK!"
                : result === "player"
                  ? "🏆 AI CÂȘTIGAT!"
                  : result === "dealer"
                    ? "💀 DEALER CÂȘTIGĂ"
                    : "🤝 EGALITATE"}
            </span>
            {lastWin !== null && lastWin > 0 && (
              <span style={s.resultWin}>+{lastWin} RON</span>
            )}
          </div>
        )}
        <div style={s.area}>
          <div style={s.areaLabel}>
            JUCĂTOR {phase !== "betting" ? `— ${pv}` : ""}
            {pv > 21 && <span style={{ color: "#ff2d55" }}> BUST!</span>}
          </div>
          <div style={s.hand}>
            {playerHand.length === 0 && <div style={s.emptyHand}>Tu</div>}
            {playerHand.map((c, i) => (
              <CardEl key={i} card={c} delay={i * 150} />
            ))}
          </div>
        </div>
      </div>
      <div style={s.controls}>
        {phase === "betting" && (
          <>
            <div style={s.balRow}>
              <span style={s.balLabel}>SOLD:</span>
              <span style={s.balVal}>
                {state.balance.toLocaleString("ro-RO")} RON
              </span>
            </div>
            <div style={s.betLabel}>SELECTEAZĂ PARIUL</div>
            <div style={s.chipRow}>
              {[10, 25, 50, 100, 200, 500].map((v) => (
                <button
                  key={v}
                  onClick={() => setBetInput(String(v))}
                  style={{
                    ...s.chip,
                    ...(betInput === String(v) ? s.chipActive : {}),
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
              style={s.betInput}
              min={1}
              max={state.balance}
              placeholder="Sumă personalizată..."
            />
            <button onClick={dealGame} style={s.btnPrimary}>
              🃏 DISTRIBUIE CĂRȚILE
            </button>
          </>
        )}
        {phase === "playing" && (
          <div style={s.actionRow}>
            <button onClick={hit} style={s.btnHit}>
              HIT +
            </button>
            <button onClick={stand} style={s.btnStand}>
              STAND —
            </button>
            <div style={s.betBadge}>Pariu: {bet} RON</div>
          </div>
        )}
        {phase === "dealer" && (
          <div style={s.actionRow}>
            <div style={s.waiting}>⏳ Dealer joacă...</div>
          </div>
        )}
        {phase === "result" && (
          <div style={s.actionRow}>
            <button onClick={newGame} style={s.btnPrimary}>
              ↻ JOC NOU
            </button>
            <div style={s.balRow}>
              <span style={s.balLabel}>SOLD:</span>
              <span style={s.balVal}>
                {state.balance.toLocaleString("ro-RO")} RON
              </span>
            </div>
          </div>
        )}
      </div>
      <div style={s.rules}>
        Blackjack plătește 3:2 · Dealer stă la 17 · 2 pachete amestecate
      </div>
    </div>
  );
}

function CardEl({ card, delay }: { card: Card; delay: number }) {
  const red = isRed(card.suit);
  if (card.hidden) {
    return (
      <div style={{ ...cs.card, ...cs.back, animationDelay: `${delay}ms` }}>
        <div style={cs.backPattern} />
      </div>
    );
  }
  return (
    <div style={{ ...cs.card, animationDelay: `${delay}ms` }}>
      <div style={{ ...cs.corner, color: red ? "#e03030" : "#1a1a2e" }}>
        <div style={cs.rank}>{card.rank}</div>
        <div style={cs.suit}>{card.suit}</div>
      </div>
      <div style={{ ...cs.center, color: red ? "#e03030" : "#1a1a2e" }}>
        {card.suit}
      </div>
      <div
        style={{
          ...cs.corner,
          ...cs.cornerBR,
          color: red ? "#e03030" : "#1a1a2e",
        }}
      >
        <div style={cs.rank}>{card.rank}</div>
        <div style={cs.suit}>{card.suit}</div>
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
  table: {
    background: "radial-gradient(ellipse at 50% 30%, #0b3d1a 0%, #061408 100%)",
    border: "3px solid rgba(200,241,53,0.18)",
    borderRadius: "20px 20px 0 0",
    padding: "28px 36px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    boxShadow: "inset 0 0 100px rgba(0,0,0,0.5)",
  },
  tableLogo: {
    textAlign: "center",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 12,
    letterSpacing: 6,
    color: "rgba(200,241,53,0.25)",
  },
  area: { display: "flex", flexDirection: "column", gap: 8 },
  areaLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.35)",
  },
  hand: { display: "flex", gap: 10, flexWrap: "wrap" as const, minHeight: 108 },
  emptyHand: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
  },
  divider: { height: 1, background: "rgba(200,241,53,0.1)", margin: "4px 0" },
  resultBanner: {
    border: "1px solid",
    borderRadius: 10,
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    animation: "fadeInUp 0.3s ease",
  },
  resultText: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 26,
    letterSpacing: 3,
    color: "#f0f4ff",
  },
  resultWin: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 30,
    color: "#c8f135",
  },
  controls: {
    background: "#0d1017",
    borderRadius: "0 0 16px 16px",
    border: "1px solid rgba(255,255,255,0.06)",
    borderTop: "none",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  balRow: { display: "flex", alignItems: "baseline", gap: 8 },
  balLabel: {
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
  betLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#3d4660",
  },
  chipRow: { display: "flex", gap: 8, flexWrap: "wrap" as const },
  chip: {
    background: "#161b2e",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: "50%",
    width: 46,
    height: 46,
    color: "#8892a4",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  chipActive: {
    borderColor: "#c8f135",
    color: "#c8f135",
    background: "rgba(200,241,53,0.1)",
    boxShadow: "0 0 12px rgba(200,241,53,0.3)",
  },
  betInput: {
    width: "100%",
    background: "#080a0f",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 6,
    color: "#f0f4ff",
    padding: "10px 14px",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box" as const,
  },
  btnPrimary: {
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
  actionRow: { display: "flex", alignItems: "center", gap: 12 },
  btnHit: {
    flex: 1,
    background: "linear-gradient(135deg, #00e5ff, #0090b0)",
    color: "#06080c",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    letterSpacing: 2,
    padding: "12px 0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnStand: {
    flex: 1,
    background: "linear-gradient(135deg, #ff6b2b, #c44000)",
    color: "#fff",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 22,
    letterSpacing: 2,
    padding: "12px 0",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  betBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#8892a4",
    whiteSpace: "nowrap" as const,
  },
  waiting: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    color: "#8892a4",
  },
  rules: {
    textAlign: "center" as const,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#252c40",
    letterSpacing: 1,
    padding: "8px 0",
  },
};
const cs: Record<string, React.CSSProperties> = {
  card: {
    width: 68,
    height: 100,
    background: "#fefefe",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.15)",
    position: "relative",
    boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
    animation: "fadeInUp 0.3s ease both",
    flexShrink: 0,
  },
  back: {
    background: "linear-gradient(135deg, #1a2060, #0a0e30)",
    overflow: "hidden",
  },
  backPattern: {
    position: "absolute",
    inset: 5,
    backgroundImage:
      "repeating-linear-gradient(45deg, rgba(200,241,53,0.07) 0px, rgba(200,241,53,0.07) 2px, transparent 2px, transparent 9px)",
    borderRadius: 4,
    border: "1px solid rgba(200,241,53,0.12)",
  },
  corner: {
    position: "absolute",
    top: 5,
    left: 7,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
  },
  cornerBR: {
    top: "auto",
    left: "auto",
    bottom: 5,
    right: 7,
    transform: "rotate(180deg)",
  },
  rank: { fontFamily: "'Bebas Neue', cursive", fontSize: 16, lineHeight: "1" },
  suit: { fontSize: 11, lineHeight: "1" },
  center: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 30,
  },
};
