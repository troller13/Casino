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

export type PickLabel = '1' | 'X' | '2';

export interface Selection {
  id: string;
  matchId: string;
  matchLabel: string;
  pick: string;
  pickLabel: PickLabel;
  odd: number;
}

// ─── App State Types ──────────────────────────────────────────────────────────

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
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
