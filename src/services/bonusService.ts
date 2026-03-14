import {
  getBonusDefinitions,
  upsertUserBonus,
  recordActivity,
  getActivityCount,
  getConsecutiveLoginDays,
  type BonusDefinition,
  type ActivityType,
} from "./supabase";

// ─── Process bonus triggers after an action ───────────────────────────────────
// Returns list of newly-unlocked bonus IDs (progress reached target)

export async function processBonusTrigger(
  userId: string,
  action: ActivityType,
  metadata: Record<string, unknown> = {},
): Promise<string[]> {
  // Record the activity first
  await recordActivity(userId, action, metadata);

  // Get all bonus definitions
  const defs = await getBonusDefinitions();
  const unlocked: string[] = [];

  for (const def of defs) {
    let progressIncrement = 0;

    switch (def.trigger_type) {
      case "first_login":
        if (action === "first_login") progressIncrement = 1;
        break;

      case "first_bet":
        if (action === "sport_bet_placed") {
          const count = await getActivityCount(userId, "sport_bet_placed");
          // Only first bet triggers this
          if (count === 1) progressIncrement = 1;
        }
        break;

      case "first_casino_win":
        if (action === "sport_bet_won") progressIncrement = 1;
        break;

      case "streak_3":
        // Any bet (sport or casino) counts
        if (action === "sport_bet_placed" || action === "casino_bet_placed") {
          progressIncrement = 1;
        }
        break;

      case "bet_100":
        // High roller: single bet >= 100 MDL
        if (
          (action === "sport_bet_placed" || action === "casino_bet_placed") &&
          typeof metadata.amount === "number" &&
          metadata.amount >= 100
        ) {
          progressIncrement = 1;
        }
        break;

      case "daily_login":
        if (action === "daily_login") {
          const days = await getConsecutiveLoginDays(userId);
          // Set progress to consecutive days (not increment)
          const ub = await upsertUserBonus(userId, def, 0);
          if (ub) {
            // Directly set progress to consecutive days
            const { supabase } = await import("./supabase");
            const newProgress = Math.min(days, def.trigger_value);
            await supabase
              .from("user_bonuses")
              .update({ progress: newProgress })
              .eq("id", ub.id);
            if (newProgress >= def.trigger_value) unlocked.push(def.id);
          }
          continue;
        }
        break;
    }

    if (progressIncrement > 0) {
      const ub = await upsertUserBonus(userId, def, progressIncrement);
      if (ub && ub.progress >= ub.target && ub.status === "available") {
        unlocked.push(def.id);
      }
    }
  }

  return unlocked;
}

// ─── Check if already logged in today ────────────────────────────────────────
export async function checkDailyLogin(userId: string): Promise<boolean> {
  const { supabase, IS_SUPABASE_CONFIGURED } = await import("./supabase");
  if (!IS_SUPABASE_CONFIGURED) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("user_activity")
    .select("id")
    .eq("user_id", userId)
    .eq("action_type", "daily_login")
    .gte("created_at", today.toISOString())
    .limit(1);

  const alreadyLogged = (data?.length ?? 0) > 0;
  if (!alreadyLogged) {
    await processBonusTrigger(userId, "daily_login");
  }
  return !alreadyLogged; // true = just logged in for today
}
