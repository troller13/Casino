import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
  // Helper: returns value based on current theme
  tv: (darkVal: string, lightVal: string) => string;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
  tv: (d) => d,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("betzone_theme") as Theme) ?? "dark",
  );

  useEffect(() => {
    // Set data-theme on html element — CSS can target [data-theme="light"]
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("betzone_theme", theme);

    if (theme === "light") {
      document.documentElement.style.setProperty("--bg-base", "#f0f2f8");
      document.documentElement.style.setProperty("--bg-surface", "#ffffff");
      document.documentElement.style.setProperty("--bg-card", "#f7f8fc");
      document.documentElement.style.setProperty("--bg-card2", "#eef0f7");
      document.documentElement.style.setProperty("--text-1", "#0d1117");
      document.documentElement.style.setProperty("--text-2", "#4a5568");
      document.documentElement.style.setProperty("--text-3", "#94a3b8");
      document.documentElement.style.setProperty(
        "--border-col",
        "rgba(0,0,0,0.09)",
      );
      document.documentElement.style.setProperty("--accent", "#3a7d00");
      document.body.style.background = "#f0f2f8";
      document.body.style.color = "#0d1117";
    } else {
      document.documentElement.style.setProperty("--bg-base", "#06080c");
      document.documentElement.style.setProperty("--bg-surface", "#0d1017");
      document.documentElement.style.setProperty("--bg-card", "#111520");
      document.documentElement.style.setProperty("--bg-card2", "#161b2e");
      document.documentElement.style.setProperty("--text-1", "#f0f4ff");
      document.documentElement.style.setProperty("--text-2", "#8892a4");
      document.documentElement.style.setProperty("--text-3", "#3d4660");
      document.documentElement.style.setProperty(
        "--border-col",
        "rgba(255,255,255,0.06)",
      );
      document.documentElement.style.setProperty("--accent", "#c8f135");
      document.body.style.background = "#06080c";
      document.body.style.color = "#f0f4ff";
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const isDark = theme === "dark";

  // tv = "theme value" — pick dark or light value
  const tv = (darkVal: string, lightVal: string) =>
    isDark ? darkVal : lightVal;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark, tv }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Themed style helpers ─────────────────────────────────────────────────────
// Use these in components so they respond to theme changes

export function useThemedStyles() {
  const { isDark } = useTheme();
  return {
    bgBase: isDark ? "#06080c" : "#f0f2f8",
    bgSurface: isDark ? "#0d1017" : "#ffffff",
    bgCard: isDark ? "#111520" : "#f7f8fc",
    bgCard2: isDark ? "#161b2e" : "#eef0f7",
    bgInput: isDark ? "#080a0f" : "#ffffff",
    text1: isDark ? "#f0f4ff" : "#0d1117",
    text2: isDark ? "#8892a4" : "#4a5568",
    text3: isDark ? "#3d4660" : "#94a3b8",
    text4: isDark ? "#252c40" : "#cbd5e1",
    border: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.09)",
    border2: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
    accent: isDark ? "#c8f135" : "#3a7d00",
    accentBg: isDark ? "rgba(200,241,53,0.08)" : "rgba(58,125,0,0.08)",
    shadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.5)"
      : "0 8px 32px rgba(0,0,0,0.1)",
  };
}
