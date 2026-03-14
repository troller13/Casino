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
      { id: userId, username, balance: 1000.0 },
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

// ─── Sport Bets ───────────────────────────────────────────────────────────────

import type { SportBet, Selection } from "../types/index.ts";

export interface CreateSportBetInput {
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
}

export async function createSportBet(
  input: CreateSportBetInput,
): Promise<SportBet | null> {
  if (!IS_SUPABASE_CONFIGURED) {
    console.warn("[supabase] createSportBet: Supabase not configured");
    return null;
  }
  console.log(
    "[supabase] createSportBet:",
    input.home_team,
    "vs",
    input.away_team,
  );
  const { data, error } = await supabase
    .from("sport_bets")
    .insert({
      ...input,
      selections: input.selections as unknown as Record<string, unknown>[],
      status: "pending",
      actual_win: 0,
    })
    .select()
    .single();
  if (error) {
    console.error(
      "[supabase] createSportBet error:",
      error.message,
      error.code,
      error.details,
    );
    return null;
  }
  console.log("[supabase] createSportBet success, id:", data?.id);
  return data as unknown as SportBet;
}

export async function getPendingSportBets(userId: string): Promise<SportBet[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from("sport_bets")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[supabase] getPendingSportBets:", error.message);
    return [];
  }
  return (data ?? []) as unknown as SportBet[];
}

export async function getAllSportBets(
  userId: string,
  limit = 50,
): Promise<SportBet[]> {
  if (!IS_SUPABASE_CONFIGURED) {
    console.warn("[supabase] getAllSportBets: Supabase not configured");
    return [];
  }
  console.log("[supabase] getAllSportBets for user:", userId);
  const { data, error } = await supabase
    .from("sport_bets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error(
      "[supabase] getAllSportBets error:",
      error.message,
      error.code,
    );
    return [];
  }
  console.log("[supabase] getAllSportBets result:", data?.length ?? 0, "rows");
  return (data ?? []) as unknown as SportBet[];
}

export async function settleSportBet(
  betId: string,
  status: "won" | "lost" | "void",
  actualWin: number,
  resultHome?: string,
  resultAway?: string,
): Promise<boolean> {
  if (!IS_SUPABASE_CONFIGURED) return false;
  const { error } = await supabase
    .from("sport_bets")
    .update({
      status,
      actual_win: actualWin,
      result_home: resultHome ?? null,
      result_away: resultAway ?? null,
      settled_at: new Date().toISOString(),
    })
    .eq("id", betId);
  if (error) {
    console.error("[supabase] settleSportBet:", error.message);
    return false;
  }
  return true;
}

// ─── Bonus Types ──────────────────────────────────────────────────────────────

export interface BonusDefinition {
  id: string;
  title: string;
  description: string;
  amount: number;
  trigger_type: string;
  trigger_value: number;
  expires_days: number;
  active: boolean;
}

export interface UserBonus {
  id: string;
  user_id: string;
  bonus_id: string;
  status: "available" | "claimed" | "expired";
  progress: number;
  target: number;
  amount: number;
  claimed_at: string | null;
  expires_at: string | null;
  created_at: string;
  bonus?: BonusDefinition;
}

export type ActivityType =
  | "first_login"
  | "sport_bet_placed"
  | "casino_bet_placed"
  | "sport_bet_won"
  | "daily_login";

// ─── Bonus DB helpers ─────────────────────────────────────────────────────────

export async function getUserBonuses(userId: string): Promise<UserBonus[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from("user_bonuses")
    .select("*, bonus:bonus_definitions(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[supabase] getUserBonuses:", error.message);
    return [];
  }
  return (data ?? []) as unknown as UserBonus[];
}

export async function claimBonus(
  bonusId: string,
  userId: string,
): Promise<number | null> {
  if (!IS_SUPABASE_CONFIGURED) return null;
  // Get the bonus
  const { data: ub, error: ubErr } = await supabase
    .from("user_bonuses")
    .select("*")
    .eq("id", bonusId)
    .eq("user_id", userId)
    .eq("status", "available")
    .single();
  if (ubErr || !ub) {
    console.error("[supabase] claimBonus: not found or not available");
    return null;
  }
  if ((ub as UserBonus).progress < (ub as UserBonus).target) return null;

  const { error } = await supabase
    .from("user_bonuses")
    .update({ status: "claimed", claimed_at: new Date().toISOString() })
    .eq("id", bonusId);
  if (error) {
    console.error("[supabase] claimBonus update:", error.message);
    return null;
  }
  return (ub as UserBonus).amount;
}

export async function upsertUserBonus(
  userId: string,
  bonusDef: BonusDefinition,
  progressIncrement: number,
): Promise<UserBonus | null> {
  if (!IS_SUPABASE_CONFIGURED) return null;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + bonusDef.expires_days);

  // Try to update existing
  const { data: existing } = await supabase
    .from("user_bonuses")
    .select("*")
    .eq("user_id", userId)
    .eq("bonus_id", bonusDef.id)
    .single();

  if (existing && (existing as UserBonus).status === "available") {
    const newProgress = Math.min(
      (existing as UserBonus).progress + progressIncrement,
      (existing as UserBonus).target,
    );
    const { data, error } = await supabase
      .from("user_bonuses")
      .update({ progress: newProgress })
      .eq("id", (existing as UserBonus).id)
      .select()
      .single();
    if (error) {
      console.error("[supabase] upsertUserBonus update:", error.message);
      return null;
    }
    return data as unknown as UserBonus;
  }

  if (!existing) {
    const { data, error } = await supabase
      .from("user_bonuses")
      .insert({
        user_id: userId,
        bonus_id: bonusDef.id,
        status: "available",
        progress: Math.min(progressIncrement, bonusDef.trigger_value),
        target: bonusDef.trigger_value,
        amount: bonusDef.amount,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    if (error) {
      console.error("[supabase] upsertUserBonus insert:", error.message);
      return null;
    }
    return data as unknown as UserBonus;
  }
  return null;
}

export async function recordActivity(
  userId: string,
  actionType: ActivityType,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!IS_SUPABASE_CONFIGURED) return;
  await supabase.from("user_activity").insert({
    user_id: userId,
    action_type: actionType,
    metadata,
  });
}

export async function getBonusDefinitions(): Promise<BonusDefinition[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from("bonus_definitions")
    .select("*")
    .eq("active", true);
  if (error) {
    console.error("[supabase] getBonusDefinitions:", error.message);
    return [];
  }
  return (data ?? []) as BonusDefinition[];
}

export async function getActivityCount(
  userId: string,
  actionType: ActivityType,
): Promise<number> {
  if (!IS_SUPABASE_CONFIGURED) return 0;
  const { count, error } = await supabase
    .from("user_activity")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action_type", actionType);
  if (error) return 0;
  return count ?? 0;
}

// Check consecutive login days
export async function getConsecutiveLoginDays(userId: string): Promise<number> {
  if (!IS_SUPABASE_CONFIGURED) return 0;
  const { data, error } = await supabase
    .from("user_activity")
    .select("created_at")
    .eq("user_id", userId)
    .eq("action_type", "daily_login")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data?.length) return 0;

  let consecutive = 1;
  for (let i = 0; i < data.length - 1; i++) {
    const d1 = new Date(data[i].created_at);
    const d2 = new Date(data[i + 1].created_at);
    const diff = Math.floor((d1.getTime() - d2.getTime()) / 86400000);
    if (diff === 1) consecutive++;
    else break;
  }
  return consecutive;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
import type {
  ChatMessage,
  LeaderboardEntry,
  UserXP,
  BalancePoint,
  Tournament,
  TournamentEntry,
} from "../types/index.ts";

export async function getChatMessages(
  roomId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[chat] get:", error.message);
    return [];
  }
  return (data ?? []) as ChatMessage[];
}

export async function sendChatMessage(
  roomId: string,
  userId: string,
  username: string,
  message: string,
): Promise<boolean> {
  if (!IS_SUPABASE_CONFIGURED) return false;
  const { error } = await supabase
    .from("chat_messages")
    .insert({ room_id: roomId, user_id: userId, username, message });
  if (error) {
    console.error("[chat] send:", error.message);
    return false;
  }
  return true;
}

export function subscribeChatRoom(
  roomId: string,
  onMessage: (msg: ChatMessage) => void,
) {
  return supabase
    .channel(`chat:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => onMessage(payload.new as ChatMessage),
    )
    .subscribe();
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export async function getLeaderboard(
  weekStart?: string,
): Promise<LeaderboardEntry[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const monday = weekStart ?? getMonday();
  const { data, error } = await supabase
    .from("leaderboard_snapshots")
    .select("*")
    .eq("week_start", monday)
    .order("profit", { ascending: false })
    .limit(20);
  if (error) {
    console.error("[leaderboard] get:", error.message);
    return [];
  }
  return (data ?? []) as LeaderboardEntry[];
}

export async function upsertLeaderboardEntry(
  entry: Omit<LeaderboardEntry, "id">,
): Promise<void> {
  if (!IS_SUPABASE_CONFIGURED) return;
  await supabase.from("leaderboard_snapshots").upsert(
    {
      ...entry,
      week_start: getMonday(),
    },
    { onConflict: "user_id,week_start" },
  );
}

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

// ─── XP / Levels ──────────────────────────────────────────────────────────────
export async function getUserXP(userId: string): Promise<UserXP | null> {
  if (!IS_SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from("user_xp")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as UserXP;
}

export async function addXP(
  userId: string,
  amount: number,
): Promise<UserXP | null> {
  if (!IS_SUPABASE_CONFIGURED) return null;
  const current = await getUserXP(userId);
  const newXP = (current?.xp_total ?? 0) + amount;
  const { LEVELS, getLevelForXP } = await import("../types/index.ts");
  const levelInfo = getLevelForXP(newXP);
  const { data, error } = await supabase
    .from("user_xp")
    .upsert(
      {
        user_id: userId,
        xp_total: newXP,
        level: levelInfo.level,
        level_name: levelInfo.name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) {
    console.error("[xp] add:", error.message);
    return null;
  }
  return data as UserXP;
}

// ─── Balance History ──────────────────────────────────────────────────────────
export async function addBalancePoint(
  userId: string,
  balance: number,
  delta: number,
  reason: string,
): Promise<void> {
  if (!IS_SUPABASE_CONFIGURED) return;
  await supabase
    .from("balance_history")
    .insert({ user_id: userId, balance, delta, reason });
}

export async function getBalanceHistory(
  userId: string,
  limit = 100,
): Promise<BalancePoint[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from("balance_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[balance_history]:", error.message);
    return [];
  }
  return (data ?? []) as BalancePoint[];
}

// ─── Tournaments ──────────────────────────────────────────────────────────────
export async function getTournaments(): Promise<Tournament[]> {
  if (!IS_SUPABASE_CONFIGURED) return [];
  const { data, error } = await supabase
    .from("tournaments")
    .select("*, entries:tournament_entries(*)")
    .order("starts_at", { ascending: true });
  if (error) {
    console.error("[tournaments]:", error.message);
    return [];
  }
  return (data ?? []) as Tournament[];
}

export async function joinTournament(
  tournamentId: string,
  userId: string,
  username: string,
  balance: number,
): Promise<boolean> {
  if (!IS_SUPABASE_CONFIGURED) return false;
  const { error } = await supabase.from("tournament_entries").insert({
    tournament_id: tournamentId,
    user_id: userId,
    username,
    starting_balance: balance,
    current_balance: balance,
    profit: 0,
  });
  if (error) {
    console.error("[tournament] join:", error.message);
    return false;
  }
  // Increase prize pool
  await supabase
    .from("tournaments")
    .update({
      prize_pool: supabase.rpc("increment_prize", { tid: tournamentId }),
    })
    .eq("id", tournamentId);
  return true;
}

// ─── Cashout ──────────────────────────────────────────────────────────────────
export async function requestCashout(
  sportBetId: string,
  userId: string,
  cashoutAmt: number,
  originalStake: number,
  pct: number,
): Promise<boolean> {
  if (!IS_SUPABASE_CONFIGURED) return false;
  const { error } = await supabase.from("cashout_requests").insert({
    user_id: userId,
    sport_bet_id: sportBetId,
    cashout_pct: pct,
    cashout_amt: cashoutAmt,
    original_stake: originalStake,
    status: "pending",
  });
  if (error) {
    console.error("[cashout]:", error.message);
    return false;
  }
  return true;
}
