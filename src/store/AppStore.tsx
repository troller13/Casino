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
  type UserProfile,
  type BetRecord,
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
}

const initialState: AppState = {
  user: null,
  profile: null,
  authLoading: true,
  apiKey: localStorage.getItem(STORAGE_KEY) || ODDS_API_KEY,
  balance: 0,
  selections: [],
  toasts: [],
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
  | { type: "REMOVE_TOAST"; id: string };

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
      if (amount > current) return false; // sold insuficient
      const newBalance = current - amount;
      dispatch({ type: "SET_BALANCE", balance: newBalance });
      await persistBalance(newBalance);
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
