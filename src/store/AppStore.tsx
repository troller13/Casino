import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { Selection, ToastMessage } from "../types/index.ts";
import { MAX_SELECTIONS, STORAGE_KEY, ODDS_API_KEY } from "../services/config";
import {
  supabase,
  getProfile,
  upsertProfile,
  updateBalance,
  recordBet,
  IS_SUPABASE_CONFIGURED,
  createSportBet,
  getAllSportBets,
  getPendingSportBets,
  settleSportBet,
  type UserProfile,
  type BetRecord,
  type CreateSportBetInput,
} from "../services/supabase";
import { fetchScores, determineWinner } from "../services/api";
import type { SportBet, MatchScore } from "../types/index.ts";
import {
  getUserBonuses,
  claimBonus,
  type UserBonus,
} from "../services/supabase";
import { processBonusTrigger, checkDailyLogin } from "../services/bonusService";
import {
  addXP,
  addBalancePoint,
  upsertLeaderboardEntry,
} from "../services/supabase";

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  apiKey: string;
  balance: number;
  selections: Selection[];
  toasts: ToastMessage[];
  sportBets: SportBet[];
  checkingResults: boolean;
  bonuses: UserBonus[];
  bonusLoading: boolean;
  xpTotal: number;
}

const initialState: AppState = {
  user: null,
  profile: null,
  authLoading: true,
  apiKey: localStorage.getItem(STORAGE_KEY) || ODDS_API_KEY,
  balance: 0,
  selections: [],
  toasts: [],
  sportBets: [],
  checkingResults: false,
  bonuses: [],
  bonusLoading: false,
  xpTotal: 0,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_AUTH"; user: User | null; profile: UserProfile | null }
  | { type: "SET_API_KEY"; key: string }
  | { type: "ADD_SELECTION"; selection: Selection }
  | { type: "REMOVE_SELECTION"; id: string }
  | { type: "CLEAR_SELECTIONS" }
  | { type: "SET_BALANCE"; balance: number }
  | { type: "ADJUST_BALANCE"; delta: number } // +/- față de curent
  | { type: "ADD_TOAST"; toast: ToastMessage }
  | { type: "REMOVE_TOAST"; id: string }
  | { type: "SET_SPORT_BETS"; bets: SportBet[] }
  | { type: "ADD_SPORT_BET"; bet: SportBet }
  | { type: "UPDATE_SPORT_BET"; bet: SportBet }
  | { type: "SET_CHECKING_RESULTS"; value: boolean }
  | { type: "SET_BONUSES"; bonuses: UserBonus[] }
  | { type: "UPDATE_BONUS"; bonus: UserBonus }
  | { type: "SET_BONUS_LOADING"; value: boolean };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_AUTH":
      return {
        ...state,
        user: action.user,
        profile: action.profile,
        // Soldul vine INTOTDEAUNA din DB la login/refresh
        balance: action.profile?.balance ?? 0,
        authLoading: false,
      };
    case "SET_API_KEY":
      localStorage.setItem(STORAGE_KEY, action.key);
      return { ...state, apiKey: action.key };
    case "ADD_SELECTION": {
      const { selection } = action;
      const filtered = state.selections.filter(
        (s) => s.matchId !== selection.matchId,
      );
      const alreadyExists = state.selections.some((s) => s.id === selection.id);
      if (alreadyExists)
        return {
          ...state,
          selections: state.selections.filter((s) => s.id !== selection.id),
        };
      if (filtered.length >= MAX_SELECTIONS) return state;
      return { ...state, selections: [...filtered, selection] };
    }
    case "REMOVE_SELECTION":
      return {
        ...state,
        selections: state.selections.filter((s) => s.id !== action.id),
      };
    case "CLEAR_SELECTIONS":
      return { ...state, selections: [] };
    case "SET_BALANCE":
      return { ...state, balance: Math.max(0, action.balance) };
    case "ADJUST_BALANCE":
      return { ...state, balance: Math.max(0, state.balance + action.delta) };
    case "SET_SPORT_BETS":
      return { ...state, sportBets: action.bets };
    case "ADD_SPORT_BET":
      return { ...state, sportBets: [action.bet, ...state.sportBets] };
    case "UPDATE_SPORT_BET":
      return {
        ...state,
        sportBets: state.sportBets.map((b) =>
          b.id === action.bet.id ? action.bet : b,
        ),
      };
    case "SET_CHECKING_RESULTS":
      return { ...state, checkingResults: action.value };
    case "SET_BONUSES":
      return { ...state, bonuses: action.bonuses };
    case "UPDATE_BONUS":
      return {
        ...state,
        bonuses: state.bonuses.map((b) =>
          b.id === action.bonus.id ? action.bonus : b,
        ),
      };
    case "SET_BONUS_LOADING":
      return { ...state, bonusLoading: action.value };
    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.toast] };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  setApiKey: (key: string) => void;
  toggleSelection: (sel: Selection) => void;
  removeSelection: (id: string) => void;
  clearSelections: () => void;
  totalOdds: number;
  potentialWin: (stake: number) => number;
  // Finance — toate salveaza imediat in DB
  placeBet: (stake: number) => void;
  casinoDeduct: (amount: number) => Promise<boolean>;
  casinoWin: (amount: number) => Promise<void>;
  saveCasinoBet: (
    gameType: BetRecord["game_type"],
    betAmount: number,
    winAmount: number,
    details?: Record<string, unknown>,
  ) => void;
  // Sport bets
  placeSportBet: (
    input: Omit<CreateSportBetInput, "user_id">,
  ) => Promise<boolean>;
  loadSportBets: () => Promise<void>;
  checkResults: () => Promise<{ settled: number; won: number }>;
  // Bonuses
  loadBonuses: () => Promise<void>;
  claimUserBonus: (bonusId: string) => Promise<void>;
  triggerBonusAction: (
    action: string,
    metadata?: Record<string, unknown>,
  ) => Promise<void>;
  showToast: (text: string, type: ToastMessage["type"]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Ref pentru user curent (acces in callbacks fara re-creare)
  const userRef = useRef<User | null>(null);
  const balanceRef = useRef<number>(0);

  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);
  useEffect(() => {
    balanceRef.current = state.balance;
  }, [state.balance]);

  // ── Salvare sold in DB (imediata, fara debounce) ──────────────────────────
  const persistBalance = useCallback(
    async (newBalance: number): Promise<void> => {
      const userId = userRef.current?.id;
      if (!userId || !IS_SUPABASE_CONFIGURED) return;
      await updateBalance(userId, newBalance);
    },
    [],
  );

  // ── Auth listener ─────────────────────────────────────────────────────────
  const authInitialized = useRef(false);

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    if (!IS_SUPABASE_CONFIGURED) {
      dispatch({ type: "SET_AUTH", user: null, profile: null });
      return;
    }

    // Timeout de siguranta — daca nimic nu raspunde in 5s, deblocam UI
    const safetyTimer = setTimeout(() => {
      console.warn("[BETZONE] Auth timeout — deblocam UI");
      dispatch({ type: "SET_AUTH", user: null, profile: null });
    }, 5000);

    // getSession — sursa principala de adevar
    supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        clearTimeout(safetyTimer);
        if (error) {
          console.warn("[BETZONE] getSession error:", error.message);
          dispatch({ type: "SET_AUTH", user: null, profile: null });
          return;
        }
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          dispatch({ type: "SET_AUTH", user: session.user, profile });
        } else {
          dispatch({ type: "SET_AUTH", user: null, profile: null });
        }
      })
      .catch((err) => {
        clearTimeout(safetyTimer);
        console.warn("[BETZONE] getSession threw:", err);
        dispatch({ type: "SET_AUTH", user: null, profile: null });
      });

    // onAuthStateChange — pentru login/logout in timp real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      clearTimeout(safetyTimer);
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        dispatch({ type: "SET_AUTH", user: session.user, profile });
      } else {
        dispatch({ type: "SET_AUTH", user: null, profile: null });
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
    ): Promise<string | null> => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return error.message;
      if (data.user) await upsertProfile(data.user.id, username);
      return null;
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? error.message : null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // ── Bet slip actions ──────────────────────────────────────────────────────

  const setApiKey = useCallback(
    (key: string) => dispatch({ type: "SET_API_KEY", key }),
    [],
  );
  const toggleSelection = useCallback(
    (sel: Selection) => dispatch({ type: "ADD_SELECTION", selection: sel }),
    [],
  );
  const removeSelection = useCallback(
    (id: string) => dispatch({ type: "REMOVE_SELECTION", id }),
    [],
  );
  const clearSelections = useCallback(
    () => dispatch({ type: "CLEAR_SELECTIONS" }),
    [],
  );

  // ── Finance actions — toate cu persistenta imediata in DB ─────────────────

  // Pariu sportiv — scade din sold si salveaza
  const placeBet = useCallback(
    (stake: number) => {
      const newBalance = Math.max(0, balanceRef.current - stake);
      dispatch({ type: "SET_BALANCE", balance: newBalance });
      dispatch({ type: "CLEAR_SELECTIONS" });
      persistBalance(newBalance);
    },
    [persistBalance],
  );

  // Casino deduct — scade din sold, salveaza si returneaza success/fail
  const casinoDeduct = useCallback(
    async (amount: number): Promise<boolean> => {
      const current = balanceRef.current;
      if (amount > current) return false;
      const newBalance = current - amount;
      dispatch({ type: "SET_BALANCE", balance: newBalance });
      await persistBalance(newBalance);
      // Trigger casino bonus
      const userId = userRef.current?.id;
      if (userId) {
        await processBonusTrigger(userId, "casino_bet_placed", { amount });
        const bonuses = await getUserBonuses(userId);
        dispatch({ type: "SET_BONUSES", bonuses });
      }
      return true;
    },
    [persistBalance],
  );

  // Casino win — adauga la sold si salveaza
  const casinoWin = useCallback(
    async (amount: number): Promise<void> => {
      const newBalance = balanceRef.current + amount;
      dispatch({ type: "SET_BALANCE", balance: newBalance });
      await persistBalance(newBalance);
      const userId = userRef.current?.id;
      if (userId) {
        await addBalancePoint(userId, newBalance, amount, "casino_win");
        await addXP(userId, 5 + Math.min(20, Math.floor(amount / 10)));
      }
    },
    [persistBalance],
  );

  // Salveaza pariul in tabelul bets
  const saveCasinoBet = useCallback(
    (
      gameType: BetRecord["game_type"],
      betAmount: number,
      winAmount: number,
      details: Record<string, unknown> = {},
    ) => {
      const userId = userRef.current?.id;
      if (!userId) return;
      recordBet({
        user_id: userId,
        game_type: gameType,
        bet_amount: betAmount,
        win_amount: winAmount,
        details,
      });
    },
    [],
  );

  // ── Sport bet actions ────────────────────────────────────────────────────────

  const placeSportBet = useCallback(
    async (input: Omit<CreateSportBetInput, "user_id">): Promise<boolean> => {
      const userId = userRef.current?.id;
      if (!userId) return false;

      // Verifica sold
      if (input.stake > balanceRef.current) return false;

      // Scade soldul imediat
      const newBalance = balanceRef.current - input.stake;
      dispatch({ type: "SET_BALANCE", balance: newBalance });
      await persistBalance(newBalance);

      // Salveaza pariul in DB
      const bet = await createSportBet({ ...input, user_id: userId });
      if (bet) {
        dispatch({ type: "ADD_SPORT_BET", bet });
      }

      // Trigger bonus checks
      await processBonusTrigger(userId, "sport_bet_placed", {
        amount: input.stake,
      });
      // Add XP (10 XP per bet + 1 XP per MDL staked up to 50)
      const xpGain = 10 + Math.min(50, Math.floor(input.stake));
      await addXP(userId, xpGain);
      // Record balance history
      await addBalancePoint(
        userId,
        balanceRef.current,
        -input.stake,
        "bet_placed",
      );
      const bonuses = await getUserBonuses(userId);
      dispatch({ type: "SET_BONUSES", bonuses });

      return true;
    },
    [persistBalance],
  );

  const loadSportBets = useCallback(async (): Promise<void> => {
    const userId = userRef.current?.id;
    if (!userId) return;
    const bets = await getAllSportBets(userId);
    dispatch({ type: "SET_SPORT_BETS", bets });
  }, []);

  // Verifica rezultatele pariurilor pending si crediteaza castigurile
  const checkResults = useCallback(async (): Promise<{
    settled: number;
    won: number;
  }> => {
    const userId = userRef.current?.id;
    if (!userId) return { settled: 0, won: 0 };

    dispatch({ type: "SET_CHECKING_RESULTS", value: true });

    const apiKey = localStorage.getItem("betzone_api_key") || "";
    if (!apiKey) {
      dispatch({ type: "SET_CHECKING_RESULTS", value: false });
      return { settled: 0, won: 0 };
    }

    // Ia pariurile pending
    const pendingBets = await getPendingSportBets(userId);
    if (!pendingBets.length) {
      dispatch({ type: "SET_CHECKING_RESULTS", value: false });
      return { settled: 0, won: 0 };
    }

    // Grupeaza dupa sport_key pentru a face mai putine request-uri API
    const bySport = pendingBets.reduce<Record<string, typeof pendingBets>>(
      (acc, bet) => {
        if (!acc[bet.sport_key]) acc[bet.sport_key] = [];
        acc[bet.sport_key].push(bet);
        return acc;
      },
      {},
    );

    let settled = 0;
    let won = 0;

    for (const [sportKey, bets] of Object.entries(bySport)) {
      let scores: MatchScore[] = [];
      try {
        scores = await fetchScores(apiKey, sportKey, 3);
      } catch {
        continue; // skip sport daca API da eroare
      }

      for (const bet of bets) {
        // Gaseste scorul pentru meciul din pariu
        const score = scores.find((s) => s.id === bet.match_id);
        if (!score || !score.completed) continue; // meciul nu s-a terminat

        const winner = determineWinner(score);
        if (winner === null) continue;

        // Verifica daca pariul e castigat
        // Fiecare selectie trebuie sa fie corecta (pariu combinat)
        let allCorrect = true;
        for (const sel of bet.selections) {
          const pickLabel = sel.pickLabel; // '1' | 'X' | '2'
          const isCorrect =
            (pickLabel === "1" && winner === "home") ||
            (pickLabel === "2" && winner === "away") ||
            (pickLabel === "X" && winner === "draw");
          if (!isCorrect) {
            allCorrect = false;
            break;
          }
        }

        const status = allCorrect ? "won" : "lost";
        const actualWin = allCorrect ? bet.potential_win : 0;

        // Scorul final
        const homeScore =
          score.scores?.find((s) => s.name === score.home_team)?.score ?? null;
        const awayScore =
          score.scores?.find((s) => s.name === score.away_team)?.score ?? null;

        // Actualizeaza in DB
        await settleSportBet(
          bet.id,
          status,
          actualWin,
          homeScore ?? undefined,
          awayScore ?? undefined,
        );

        // Daca a castigat, crediteaza soldul
        if (allCorrect && actualWin > 0) {
          const newBalance = balanceRef.current + actualWin;
          dispatch({ type: "SET_BALANCE", balance: newBalance });
          await persistBalance(newBalance);
          won += actualWin;
          // Trigger first win bonus + XP
          if (userId) {
            await processBonusTrigger(userId, "sport_bet_won", {
              amount: actualWin,
            });
            const winXP = 25 + Math.min(100, Math.floor(actualWin / 10));
            await addXP(userId, winXP);
            await addBalancePoint(
              userId,
              balanceRef.current,
              actualWin,
              "bet_won",
            );
            // Update leaderboard
            const totalBets = await import("../services/supabase.ts").then(
              (m) => m.getActivityCount(userId, "sport_bet_placed"),
            );
            await upsertLeaderboardEntry({
              user_id: userId,
              username: userRef.current
                ? ((
                    await import("../services/supabase.ts").then((m) =>
                      m.getProfile(userId),
                    )
                  )?.username ?? "")
                : "",
              week_start: "",
              profit: balanceRef.current - 1000,
              wins: settled + (allCorrect ? 1 : 0),
              total_bets: totalBets,
              win_rate: 0,
              xp: 0,
            });
          }
        }

        // Actualizeaza in store
        dispatch({
          type: "UPDATE_SPORT_BET",
          bet: {
            ...bet,
            status,
            actual_win: actualWin,
            result_home: homeScore,
            result_away: awayScore,
            settled_at: new Date().toISOString(),
          },
        });

        settled++;
      }
    }

    dispatch({ type: "SET_CHECKING_RESULTS", value: false });
    return { settled, won };
  }, [persistBalance]);

  // ── Bonus actions ────────────────────────────────────────────────────────────

  const loadBonuses = useCallback(async (): Promise<void> => {
    const userId = userRef.current?.id;
    if (!userId) return;
    dispatch({ type: "SET_BONUS_LOADING", value: true });
    const bonuses = await getUserBonuses(userId);
    dispatch({ type: "SET_BONUSES", bonuses });
    dispatch({ type: "SET_BONUS_LOADING", value: false });
  }, []);

  const claimUserBonus = useCallback(
    async (bonusId: string): Promise<void> => {
      const userId = userRef.current?.id;
      if (!userId) return;
      const amount = await claimBonus(bonusId, userId);
      if (amount !== null) {
        const newBalance = balanceRef.current + amount;
        dispatch({ type: "SET_BALANCE", balance: newBalance });
        await persistBalance(newBalance);
        // Refresh bonuses
        const bonuses = await getUserBonuses(userId);
        dispatch({ type: "SET_BONUSES", bonuses });
        showToast(`🎁 Bonus de ${amount} MDL revendicat!`, "success");
      } else {
        showToast("⚠️ Bonusul nu poate fi revendicat încă!", "error");
      }
    },
    [persistBalance],
  );

  const triggerBonusAction = useCallback(
    async (
      action: string,
      metadata: Record<string, unknown> = {},
    ): Promise<void> => {
      const userId = userRef.current?.id;
      if (!userId) return;
      const unlocked = await processBonusTrigger(
        userId,
        action as Parameters<typeof processBonusTrigger>[1],
        metadata,
      );
      if (unlocked.length > 0) {
        // Refresh bonuses and notify
        const bonuses = await getUserBonuses(userId);
        dispatch({ type: "SET_BONUSES", bonuses });
        unlocked.forEach(() => {
          showToast(
            "🎁 Bonus nou disponibil! Mergi la BONUSURI pentru a-l revendica.",
            "success",
          );
        });
      } else {
        // Still refresh to update progress
        const bonuses = await getUserBonuses(userId);
        dispatch({ type: "SET_BONUSES", bonuses });
      }
    },
    [],
  );

  const showToast = useCallback((text: string, type: ToastMessage["type"]) => {
    const id = Math.random().toString(36).slice(2);
    dispatch({ type: "ADD_TOAST", toast: { id, text, type } });
    setTimeout(() => dispatch({ type: "REMOVE_TOAST", id }), 3500);
  }, []);

  const totalOdds = state.selections.reduce((acc, s) => acc * s.odd, 1);
  const potentialWin = useCallback(
    (stake: number) => parseFloat((stake * totalOdds).toFixed(2)),
    [totalOdds],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        signUp,
        signIn,
        signOut,
        setApiKey,
        toggleSelection,
        removeSelection,
        clearSelections,
        totalOdds,
        potentialWin,
        placeBet,
        casinoDeduct,
        casinoWin,
        saveCasinoBet,
        placeSportBet,
        loadSportBets,
        checkResults,
        loadBonuses,
        claimUserBonus,
        triggerBonusAction,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppProvider");
  return ctx;
}
