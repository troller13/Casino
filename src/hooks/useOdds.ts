import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchOdds } from '../services/api';
import { AUTO_REFRESH_MS } from '../services/config';
import type { Match, LoadingState } from '../types';

export function useOdds(apiKey: string, sportKey: string) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!apiKey) return;
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchOdds(apiKey, sportKey);
      setMatches(data);
      setLastUpdate(new Date());
      setStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Eroare necunoscută';
      setError(msg);
      setStatus('error');
    }
  }, [apiKey, sportKey]);

  // Load on sport/key change
  useEffect(() => {
    if (!apiKey) {
      setStatus('idle');
      return;
    }
    load();

    // Auto-refresh
    timerRef.current = setInterval(load, AUTO_REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load, apiKey]);

  return { matches, status, error, lastUpdate, reload: load };
}
