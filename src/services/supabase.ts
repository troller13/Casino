import { createClient } from "@supabase/supabase-js";

// ─── Supabase Config ──────────────────────────────────────────────────────────
// Pune credentialele tale din https://supabase.com → Settings → API
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON as string | undefined;

export const IS_SUPABASE_CONFIGURED =
  !!SUPABASE_URL && !!SUPABASE_ANON && !SUPABASE_URL.includes("placeholder");

export const supabase = createClient(
  SUPABASE_URL ?? "https://placeholder.supabase.co",
  SUPABASE_ANON ?? "placeholder-key",
);

// ─── DB Types ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  created_at: string;
}

export interface BetRecord {
  id: string;
  user_id: string;
  game_type: "sports" | "blackjack" | "slots" | "roulette" | "plinko";
  bet_amount: number;
  win_amount: number;
  details: Record<string, unknown>;
  created_at: string;
}

// ─── DB Helpers ───────────────────────────────────────────────────────────────
// Toate funcțiile verifică IS_SUPABASE_CONFIGURED înainte să facă request-uri

export async function getProfile(userId: string): Promise<UserProfile | null> {
  if (!IS_SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("[supabase] getProfile:", error.message);
    return null;
  }
  return data as UserProfile;
}

export async function upsertProfile(
  userId: string,
  username: string,
): Promise<UserProfile | null> {
  if (!IS_SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, username, balance: 1000 },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select()
    .single();
  if (error) {
    console.error("[supabase] upsertProfile:", error.message);
    return null;
  }
  return data as UserProfile;
}

export async function updateBalance(
  userId: string,
  newBalance: number,
): Promise<boolean> {
  if (!IS_SUPABASE_CONFIGURED) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ balance: newBalance })
    .eq("id", userId);
  if (error) {
    console.error("[supabase] updateBalance:", error.message);
    return false;
  }
  return true;
}

export async function recordBet(
  bet: Omit<BetRecord, "id" | "created_at">,
): Promise<boolean> {
  if (!IS_SUPABASE_CONFIGURED) return false;
  const { error } = await supabase.from("bets").insert(bet);
  if (error) {
    console.error("[supabase] recordBet:", error.message);
    return false;
  }
  return true;
}

export async function getBetHistory(
  userId: string,
  limit = 20,
): Promise<BetRecord[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from("bets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[supabase] getBetHistory:", error.message);
    return [];
  }
  return (data ?? []) as BetRecord[];
}
