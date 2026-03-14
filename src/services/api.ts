import { API_BASE } from "./config";
import type { Match, ExtractedOdds, OddsStats } from "../types/index.ts";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchOdds(
  apiKey: string,
  sportKey: string,
): Promise<Match[]> {
  const url = new URL(`${API_BASE}/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "eu");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");

  const res = await fetch(url.toString());

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.message) errMsg = errJson.message;
    } catch {
      /* ignore parse error */
    }
    throw new ApiError(errMsg, res.status);
  }

  const data: Match[] = await res.json();

  // Log API quota headers
  const remaining = res.headers.get("x-requests-remaining");
  const used = res.headers.get("x-requests-used");
  if (remaining) {
    console.info(
      `[BETZONE] API quota — remaining: ${remaining}, used: ${used}`,
    );
  }

  return data;
}

export function extractOdds(match: Match): ExtractedOdds {
  if (!match.bookmakers.length) {
    return { home: null, away: null, draw: null };
  }

  const bookmaker = match.bookmakers[0];
  const h2hMarket = bookmaker.markets.find((m) => m.key === "h2h");

  if (!h2hMarket) return { home: null, away: null, draw: null };

  const { outcomes } = h2hMarket;

  return {
    home: outcomes.find((o) => o.name === match.home_team)?.price ?? null,
    away: outcomes.find((o) => o.name === match.away_team)?.price ?? null,
    draw: outcomes.find((o) => o.name === "Draw")?.price ?? null,
  };
}

export function computeStats(matches: Match[]): OddsStats | null {
  const allOdds: number[] = [];

  matches.forEach((m) => {
    const { home, away, draw } = extractOdds(m);
    if (home !== null) allOdds.push(home);
    if (away !== null) allOdds.push(away);
    if (draw !== null) allOdds.push(draw);
  });

  if (!allOdds.length) return null;

  const min = Math.min(...allOdds);
  const max = Math.max(...allOdds);
  const avg = allOdds.reduce((a, b) => a + b, 0) / allOdds.length;

  return {
    count: matches.length,
    min: min.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2),
  };
}

// ─── Scores API ───────────────────────────────────────────────────────────────

import type { MatchScore } from "../types/index.ts";

export async function fetchScores(
  apiKey: string,
  sportKey: string,
  daysFrom = 3,
): Promise<MatchScore[]> {
  const url = new URL(`${API_BASE}/sports/${sportKey}/scores`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("daysFrom", String(daysFrom));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { message?: string }).message ?? `HTTP ${res.status}`,
      res.status,
    );
  }
  return res.json() as Promise<MatchScore[]>;
}

// Determina castigatorul dintr-un MatchScore
export function determineWinner(
  score: MatchScore,
): "home" | "away" | "draw" | null {
  if (!score.completed || !score.scores) return null;

  const homeScore = score.scores.find((s) => s.name === score.home_team);
  const awayScore = score.scores.find((s) => s.name === score.away_team);

  if (!homeScore?.score || !awayScore?.score) return null;

  const h = parseFloat(homeScore.score);
  const a = parseFloat(awayScore.score);

  if (isNaN(h) || isNaN(a)) return null;
  if (h > a) return "home";
  if (a > h) return "away";
  return "draw";
}
