import { useState, useEffect, useCallback } from "react";
import { supabase, IS_SUPABASE_CONFIGURED } from "../services/supabase";

export interface FavoriteMatch {
  match_id: string;
  home_team: string;
  away_team: string;
  sport_key: string;
  commence_time?: string;
}

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<FavoriteMatch[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("betzone_favorites") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!userId || !IS_SUPABASE_CONFIGURED) return;
    supabase
      .from("favorite_matches")
      .select("*")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data?.length) {
          setFavorites(data as FavoriteMatch[]);
          localStorage.setItem("betzone_favorites", JSON.stringify(data));
        }
      });
  }, [userId]);

  const isFav = useCallback(
    (matchId: string) => favorites.some((f) => f.match_id === matchId),
    [favorites],
  );

  const toggleFav = useCallback(
    async (match: FavoriteMatch) => {
      const already = favorites.some((f) => f.match_id === match.match_id);
      let next: FavoriteMatch[];
      if (already) {
        next = favorites.filter((f) => f.match_id !== match.match_id);
        if (userId && IS_SUPABASE_CONFIGURED) {
          await supabase
            .from("favorite_matches")
            .delete()
            .eq("user_id", userId)
            .eq("match_id", match.match_id);
        }
      } else {
        next = [...favorites, match];
        if (userId && IS_SUPABASE_CONFIGURED) {
          await supabase
            .from("favorite_matches")
            .insert({ user_id: userId, ...match });
        }
      }
      setFavorites(next);
      localStorage.setItem("betzone_favorites", JSON.stringify(next));
    },
    [favorites, userId],
  );

  return { favorites, isFav, toggleFav };
}
