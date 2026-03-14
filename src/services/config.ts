import type { SportOption } from "../types/index.ts";

export const API_BASE = "https://api.the-odds-api.com/v4";

export const SPORT_OPTIONS: SportOption[] = [
  { key: "soccer_epl", icon: "⚽", label: "Premier League" },
  { key: "soccer_spain_la_liga", icon: "🇪🇸", label: "La Liga" },
  { key: "soccer_germany_bundesliga", icon: "🇩🇪", label: "Bundesliga" },
  { key: "soccer_italy_serie_a", icon: "🇮🇹", label: "Serie A" },
  { key: "soccer_france_ligue_one", icon: "🇫🇷", label: "Ligue 1" },
  { key: "soccer_uefa_champs_league", icon: "🏆", label: "Champions League" },
  { key: "basketball_nba", icon: "🏀", label: "NBA" },
  { key: "americanfootball_nfl", icon: "🏈", label: "NFL" },
  { key: "tennis_atp_french_open", icon: "🎾", label: "Tennis ATP" },
  { key: "icehockey_nhl", icon: "🏒", label: "NHL" },
];

export const DEFAULT_SPORT = "soccer_epl";
export const AUTO_REFRESH_MS = 60_000;
export const MAX_SELECTIONS = 12;
export const STORAGE_KEY = "betzone_api_key";

// ─── Cheia API pentru The Odds API ────────────────────────────────────────────
// Obține gratuit de la https://the-odds-api.com (500 req/lună)
// Înlocuiește valoarea de mai jos cu cheia ta
export const ODDS_API_KEY = "ddf537a8974624a52019e86e539a2bb4";
// ex: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
