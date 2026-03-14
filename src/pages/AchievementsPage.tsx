import React, { useEffect, useState } from "react";
import { useAppStore } from "../store/AppStore";
import { useThemedStyles } from "../store/ThemeContext";
import { supabase, IS_SUPABASE_CONFIGURED } from "../services/supabase";

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  trigger_type: string;
  trigger_value: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

const RARITY_META = {
  common: {
    label: "COMUN",
    bg: "rgba(136,146,164,0.1)",
    border: "rgba(136,146,164,0.2)",
    glow: "",
  },
  rare: {
    label: "RAR",
    bg: "rgba(0,229,255,0.08)",
    border: "rgba(0,229,255,0.25)",
    glow: "0 0 20px rgba(0,229,255,0.15)",
  },
  epic: {
    label: "EPIC",
    bg: "rgba(200,241,53,0.08)",
    border: "rgba(200,241,53,0.3)",
    glow: "0 0 24px rgba(200,241,53,0.2)",
  },
  legendary: {
    label: "LEGENDAR",
    bg: "rgba(204,68,255,0.1)",
    border: "rgba(204,68,255,0.4)",
    glow: "0 0 32px rgba(204,68,255,0.3)",
  },
};

export function AchievementsPage() {
  const { state } = useAppStore();
  const t = useThemedStyles();
  const [defs, setDefs] = useState<AchievementDef[]>([]);
  const [unlocked, setUnlocked] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!IS_SUPABASE_CONFIGURED || !state.user) {
      setLoading(false);
      return;
    }
    Promise.all([
      supabase
        .from("achievement_definitions")
        .select("*")
        .then(({ data }) => setDefs((data ?? []) as AchievementDef[])),
      supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", state.user.id)
        .then(({ data }) => setUnlocked((data ?? []) as UserAchievement[])),
    ]).finally(() => setLoading(false));
  }, [state.user]);

  const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));
  const unlockedCount = unlocked.length;
  const totalCount = defs.length;

  const byRarity = {
    legendary: defs.filter((d) => d.rarity === "legendary"),
    epic: defs.filter((d) => d.rarity === "epic"),
    rare: defs.filter((d) => d.rarity === "rare"),
    common: defs.filter((d) => d.rarity === "common"),
  };

  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`
        @keyframes unlockShine {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes legendaryPulse {
          0%,100% { box-shadow: 0 0 20px rgba(204,68,255,0.3); }
          50%     { box-shadow: 0 0 40px rgba(204,68,255,0.6); }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Bebas Neue', cursive",
            fontSize: 36,
            letterSpacing: 3,
            color: t.text1,
          }}
        >
          🏆 REALIZĂRI
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 8,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: t.text2,
            }}
          >
            <span style={{ color: "#c8f135" }}>{unlockedCount}</span> /{" "}
            {totalCount} deblocate
          </div>
          <div
            style={{
              flex: 1,
              maxWidth: 200,
              height: 6,
              background: t.bgCard2,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${totalCount ? (unlockedCount / totalCount) * 100 : 0}%`,
                height: "100%",
                background: "linear-gradient(90deg, #c8f135, #ffd23f)",
                borderRadius: 3,
                transition: "width 1s ease",
              }}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: t.text3,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          Se încarcă...
        </div>
      )}

      {!loading &&
        (["legendary", "epic", "rare", "common"] as const).map((rarity) => {
          const group = byRarity[rarity];
          if (!group.length) return null;
          const meta = RARITY_META[rarity];
          return (
            <div key={rarity} style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 18,
                  letterSpacing: 3,
                  color: meta.border.includes("204")
                    ? "#cc44ff"
                    : meta.border.includes("200")
                      ? "#c8f135"
                      : meta.border.includes("229")
                        ? "#00e5ff"
                        : t.text3,
                  marginBottom: 12,
                }}
              >
                {meta.label} (
                {group.filter((d) => unlockedIds.has(d.id)).length}/
                {group.length})
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 10,
                }}
              >
                {group.map((def) => {
                  const isUnlocked = unlockedIds.has(def.id);
                  const unlockedEntry = unlocked.find(
                    (u) => u.achievement_id === def.id,
                  );
                  return (
                    <div
                      key={def.id}
                      style={{
                        background: isUnlocked ? meta.bg : t.bgCard,
                        border: `1px solid ${isUnlocked ? meta.border : t.border}`,
                        borderRadius: 14,
                        padding: "18px 16px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 10,
                        textAlign: "center",
                        boxShadow: isUnlocked ? meta.glow : "none",
                        animation:
                          isUnlocked && rarity === "legendary"
                            ? "legendaryPulse 3s ease-in-out infinite"
                            : "none",
                        opacity: isUnlocked ? 1 : 0.45,
                        transition: "all 0.3s",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Shine effect for unlocked */}
                      {isUnlocked && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            pointerEvents: "none",
                            background: `linear-gradient(105deg, transparent 40%, ${def.color}15 50%, transparent 60%)`,
                            backgroundSize: "200% 100%",
                            animation: "unlockShine 3s linear infinite",
                          }}
                        />
                      )}
                      <div
                        style={{
                          fontSize: 36,
                          filter: isUnlocked ? "none" : "grayscale(100%)",
                        }}
                      >
                        {def.icon}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Bebas Neue', cursive",
                          fontSize: 16,
                          letterSpacing: 1,
                          color: isUnlocked ? def.color : t.text3,
                        }}
                      >
                        {def.title}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Syne', sans-serif",
                          fontSize: 11,
                          color: t.text2,
                          lineHeight: 1.4,
                        }}
                      >
                        {def.description}
                      </div>
                      {isUnlocked && unlockedEntry && (
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 8,
                            color: t.text3,
                          }}
                        >
                          {new Date(
                            unlockedEntry.unlocked_at,
                          ).toLocaleDateString("ro-RO")}
                        </div>
                      )}
                      {!isUnlocked && (
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 8,
                            color: t.text3,
                            letterSpacing: 1,
                          }}
                        >
                          🔒 BLOCAT
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
