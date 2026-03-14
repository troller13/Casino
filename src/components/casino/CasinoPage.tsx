import React, { useState } from "react";
import { Blackjack } from "./Blackjack";
import { SlotMachine } from "./SlotMachine";
import { Roulette } from "./Roulette";
import { Plinko } from "./Plinko";
import { Aviator } from "./Aviator";

type CasinoGame =
  | "lobby"
  | "blackjack"
  | "slots"
  | "roulette"
  | "plinko"
  | "aviator";

interface GameCard {
  id: CasinoGame;
  title: string;
  subtitle: string;
  emoji: string;
  rtp: string;
  minBet: number;
  color: string;
  bg: string;
  border: string;
  badge?: string;
}

const GAMES: GameCard[] = [
  {
    id: "blackjack",
    title: "BLACKJACK",
    subtitle: "Bate dealerul la 21",
    emoji: "🃏",
    rtp: "99.5%",
    minBet: 10,
    color: "#c8f135",
    bg: "radial-gradient(ellipse at top, #0d3a1f, #06080c)",
    border: "rgba(200,241,53,0.25)",
  },
  {
    id: "slots",
    title: "SLOT MACHINE",
    subtitle: "Jackpot 100× pariu",
    emoji: "🎰",
    rtp: "96%",
    minBet: 5,
    color: "#ff6b2b",
    bg: "radial-gradient(ellipse at top, #3a1a00, #06080c)",
    border: "rgba(255,107,43,0.25)",
    badge: "HOT",
  },
  {
    id: "roulette",
    title: "RULETĂ",
    subtitle: "Pariază pe roată",
    emoji: "🎡",
    rtp: "97.3%",
    minBet: 5,
    color: "#cc2200",
    bg: "radial-gradient(ellipse at top, #3a0000, #06080c)",
    border: "rgba(204,34,0,0.25)",
  },
  {
    id: "plinko",
    title: "PLINKO",
    subtitle: "Bila cade, câștigul urcă",
    emoji: "🎯",
    rtp: "98%",
    minBet: 5,
    color: "#00e5ff",
    bg: "radial-gradient(ellipse at top, #002233, #06080c)",
    border: "rgba(0,229,255,0.2)",
    badge: "NOU",
  },
  {
    id: "aviator",
    title: "AVIATOR",
    subtitle: "Cash out înainte să se prăbușească",
    emoji: "🛩️",
    rtp: "97%",
    minBet: 5,
    color: "#ff6b2b",
    bg: "radial-gradient(ellipse at top, #1a0800, #06080c)",
    border: "rgba(255,107,43,0.3)",
    badge: "HOT",
  },
];

export function CasinoPage() {
  const [activeGame, setActiveGame] = useState<CasinoGame>("lobby");

  if (activeGame !== "lobby") {
    const game = GAMES.find((g) => g.id === activeGame)!;
    return (
      <div style={s.wrap}>
        <BackBar
          onBack={() => setActiveGame("lobby")}
          title={`${game.emoji} ${game.title}`}
          color={game.color}
        />
        <div style={s.gameWrap}>
          {activeGame === "blackjack" && <Blackjack />}
          {activeGame === "slots" && <SlotMachine />}
          {activeGame === "roulette" && <Roulette />}
          {activeGame === "plinko" && <Plinko />}
          {activeGame === "aviator" && <Aviator />}
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.lobbyHeader}>
        <div style={s.lobbyEye}>🎰</div>
        <h1 style={s.lobbyTitle}>CASINO LIVE</h1>
        <p style={s.lobbySubtitle}>4 jocuri · Solduri reale · 18+</p>
      </div>

      <div style={s.gamesGrid}>
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            style={{
              ...s.gameCard,
              background: game.bg,
              borderColor: game.border,
            }}
          >
            {game.badge && (
              <div
                style={{
                  ...s.badge,
                  background: game.color,
                  color:
                    game.id === "blackjack" || game.id === "plinko"
                      ? "#06080c"
                      : "#fff",
                }}
              >
                {game.badge}
              </div>
            )}
            <div style={s.gameEmoji}>{game.emoji}</div>
            <div style={{ ...s.gameTitle, color: game.color }}>
              {game.title}
            </div>
            <div style={s.gameSub}>{game.subtitle}</div>
            <div style={s.gameMeta}>
              <span>RTP {game.rtp}</span>
              <span style={{ color: "#252c40" }}>·</span>
              <span>Min {game.minBet} RON</span>
            </div>
            <div
              style={{
                ...s.playBtn,
                background: game.color,
                color:
                  game.id === "blackjack" || game.id === "plinko"
                    ? "#06080c"
                    : "#fff",
              }}
            >
              JOACĂ ACUM →
            </div>
          </button>
        ))}
      </div>

      <p style={s.disclaimer}>
        🔞 Joacă responsabil · 18+ · Fonduri virtuale demonstrative
      </p>
    </div>
  );
}

function BackBar({
  onBack,
  title,
  color,
}: {
  onBack: () => void;
  title: string;
  color: string;
}) {
  return (
    <div style={{ ...bb.bar, borderBottomColor: `${color}22` }}>
      <button onClick={onBack} style={bb.back}>
        ← LOBBY
      </button>
      <span style={{ ...bb.title, color }}>{title}</span>
      <span style={{ width: 80 }} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 20, width: "100%" },
  lobbyHeader: { textAlign: "center", padding: "12px 0" },
  lobbyEye: { fontSize: 52, marginBottom: 8 },
  lobbyTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 44,
    letterSpacing: 5,
    color: "#f0f4ff",
    textShadow: "0 0 40px rgba(255,107,43,0.3)",
  },
  lobbySubtitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#3d4660",
    letterSpacing: 2,
    marginTop: 6,
  },
  gamesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 14,
  },
  gameCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    border: "2px solid",
    borderRadius: 16,
    padding: "28px 24px",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "transform 0.2s, box-shadow 0.2s",
    position: "relative",
    overflow: "hidden",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 3,
  },
  gameEmoji: { fontSize: 46 },
  gameTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 30,
    letterSpacing: 3,
  },
  gameSub: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 13,
    color: "#8892a4",
    fontWeight: 600,
  },
  gameMeta: {
    display: "flex",
    gap: 8,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#3d4660",
  },
  playBtn: {
    marginTop: 6,
    display: "inline-block",
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 15,
    letterSpacing: 2,
    padding: "9px 18px",
    borderRadius: 7,
    width: "fit-content",
  },
  disclaimer: {
    textAlign: "center" as const,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: "#252c40",
    letterSpacing: 1,
  },
  gameWrap: {},
};

const bb: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    background: "#0d1017",
    border: "1px solid rgba(255,255,255,0.06)",
    borderBottomWidth: 2,
    borderRadius: 8,
    padding: "10px 16px",
  },
  back: {
    background: "none",
    border: "none",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: "#8892a4",
    cursor: "pointer",
    letterSpacing: 1,
    width: 80,
  },
  title: {
    flex: 1,
    textAlign: "center" as const,
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 20,
    letterSpacing: 3,
  },
};
