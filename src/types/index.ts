// ─── API Types ────────────────────────────────────────────────────────────────

export interface Outcome {
  name: string;
  price: number;
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface Match {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface ExtractedOdds {
  home: number | null;
  away: number | null;
  draw: number | null;
}

export interface OddsStats {
  count: number;
  min: string;
  max: string;
  avg: string;
}

// ─── Bet Slip Types ───────────────────────────────────────────────────────────

export type PickLabel = "1" | "X" | "2";

export interface Selection {
  id: string;
  matchId: string;
  matchLabel: string;
  pick: string;
  pickLabel: PickLabel;
  odd: number;
}

// ─── App State Types ──────────────────────────────────────────────────────────

export type LoadingState = "idle" | "loading" | "success" | "error";

export interface ToastMessage {
  id: string;
  text: string;
  type: "success" | "error" | "info";
}

export interface SportOption {
  key: string;
  label: string;
  icon: string;
}

// ─── Config Types ─────────────────────────────────────────────────────────────

export interface ApiConfig {
  apiKey: string;
  region: string;
  market: string;
  oddsFormat: string;
}

// ─── Sport Bet Types ──────────────────────────────────────────────────────────

export type SportBetStatus = "pending" | "won" | "lost" | "void";

export interface SportBet {
  id: string;
  user_id: string;
  sport_key: string;
  match_id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  selections: Selection[];
  total_odds: number;
  stake: number;
  potential_win: number;
  actual_win: number;
  status: SportBetStatus;
  result_home: string | null;
  result_away: string | null;
  settled_at: string | null;
  created_at: string;
}

// ─── Scores API Types ─────────────────────────────────────────────────────────

export interface ScoreTeam {
  name: string;
  score: string | null;
}

export interface MatchScore {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: ScoreTeam[] | null;
  last_update: string | null;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  week_start: string;
  profit: number;
  wins: number;
  total_bets: number;
  win_rate: number;
  xp: number;
}

// ─── XP / Levels ──────────────────────────────────────────────────────────────
export interface UserXP {
  user_id: string;
  xp_total: number;
  level: number;
  level_name: string;
  updated_at: string;
}

export const LEVELS = [
  { level: 1, name: "Novice", minXP: 0, color: "#8892a4", icon: "🌱" },
  { level: 2, name: "Amateur", minXP: 100, color: "#00e5ff", icon: "🎯" },
  { level: 3, name: "Pro", minXP: 500, color: "#c8f135", icon: "⚡" },
  { level: 4, name: "Expert", minXP: 1500, color: "#ffd23f", icon: "🔥" },
  { level: 5, name: "Shark", minXP: 4000, color: "#ff6b2b", icon: "🦈" },
  { level: 6, name: "Legend", minXP: 10000, color: "#cc44ff", icon: "👑" },
];

export function getLevelForXP(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) current = l;
    else break;
  }
  const nextLevel = LEVELS.find((l) => l.level === current.level + 1);
  const progress = nextLevel
    ? Math.min(
        100,
        Math.round(
          ((xp - current.minXP) / (nextLevel.minXP - current.minXP)) * 100,
        ),
      )
    : 100;
  return { ...current, progress, nextLevel, xp };
}

// ─── Balance History ──────────────────────────────────────────────────────────
export interface BalancePoint {
  id: string;
  user_id: string;
  balance: number;
  delta: number;
  reason: string;
  created_at: string;
}

// ─── Tournament ───────────────────────────────────────────────────────────────
export interface Tournament {
  id: string;
  title: string;
  description: string;
  buy_in: number;
  prize_pool: number;
  max_players: number;
  starts_at: string;
  ends_at: string;
  status: "upcoming" | "active" | "finished";
  created_at: string;
  entries?: TournamentEntry[];
}

export interface TournamentEntry {
  id: string;
  tournament_id: string;
  user_id: string;
  username: string;
  starting_balance: number;
  current_balance: number;
  profit: number;
  rank: number | null;
  joined_at: string;
}

// ─── Theme ────────────────────────────────────────────────────────────────────
export type Theme = "dark" | "light";
