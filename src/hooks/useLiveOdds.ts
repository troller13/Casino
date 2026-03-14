import { useState, useEffect, useRef } from "react";
import type { Match } from "../types/index.js";

const API_BASE = "https://api.the-odds-api.com/v4";
const REFRESH_INTERVAL = 30000; // 30s for live odds

interface OddsSnapshot {
  matchId: string;
  home: number | null;
  away: number | null;
  draw: number | null;
}

export function useLiveOdds(apiKey: string, matches: Match[]) {
  const [prevOdds, setPrevOdds] = useState<Record<string, OddsSnapshot>>({});
  const [oddsChanges, setOddsChanges] = useState<
    Record<
      string,
      { home?: "up" | "down"; away?: "up" | "down"; draw?: "up" | "down" }
    >
  >({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect changes when matches update
  useEffect(() => {
    if (!matches.length) return;
    const changes: typeof oddsChanges = {};
    for (const m of matches) {
      const bk = m.bookmakers?.[0];
      const market = bk?.markets?.find((mk) => mk.key === "h2h");
      if (!market) continue;
      const home =
        market.outcomes.find((o) => o.name === m.home_team)?.price ?? null;
      const away =
        market.outcomes.find((o) => o.name === m.away_team)?.price ?? null;
      const draw =
        market.outcomes.find((o) => o.name === "Draw")?.price ?? null;
      const prev = prevOdds[m.id];
      if (prev) {
        const c: (typeof changes)[string] = {};
        if (home && prev.home && home !== prev.home)
          c.home = home > prev.home ? "up" : "down";
        if (away && prev.away && away !== prev.away)
          c.away = away > prev.away ? "up" : "down";
        if (draw && prev.draw && draw !== prev.draw)
          c.draw = draw > prev.draw ? "up" : "down";
        if (Object.keys(c).length) changes[m.id] = c;
      }
      setPrevOdds((p) => ({
        ...p,
        [m.id]: { matchId: m.id, home, away, draw },
      }));
    }
    if (Object.keys(changes).length) {
      setOddsChanges((prev) => ({ ...prev, ...changes }));
      // Clear changes after 3s
      setTimeout(
        () =>
          setOddsChanges((prev) => {
            const next = { ...prev };
            Object.keys(changes).forEach((k) => delete next[k]);
            return next;
          }),
        3000,
      );
    }
  }, [matches]);

  return { oddsChanges };
}
