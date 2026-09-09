"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

// "theme" is what's actually applied to the page. "preference" is what the
// user picked, including "system" — which tracks the OS setting live.
type ResolvedTheme = "light" | "dark";
type ThemePreference = "light" | "dark" | "system";

type ThemeContextType = {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  toggleTheme: () => void; // kept for existing callers (ThemeToggle) — light/dark only
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const [theme, setTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  const applyTheme = (t: ResolvedTheme) => {
    const html = document.documentElement;
    if (t === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  };

  const resolve = useCallback((pref: ThemePreference): ResolvedTheme => {
    return pref === "system" ? getSystemTheme() : pref;
  }, []);

  // localStorage sirf browser mein available hai, SSR pe nahi — isliye ye
  // effect ke andar hi chalna zaroori hai (lazy useState initializer SSR
  // ke dauran crash kar dega). Neeche wala `mounted` gate isi wajah se hai,
  // taake wrong theme ka flash na dikhe.
  useEffect(() => {
    const saved = (localStorage.getItem("themePreference") as ThemePreference | null) || "light";
    const resolved = resolve(saved);
    setPreferenceState(saved);
    setTheme(resolved);
    applyTheme(resolved);
    setMounted(true);
  }, [resolve]);

  // Jab preference "system" ho, OS ka dark/light change live follow karo.
  useEffect(() => {
    if (preference !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setTheme(resolved);
      applyTheme(resolved);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = (pref: ThemePreference) => {
    const resolved = resolve(pref);
    setPreferenceState(pref);
    setTheme(resolved);
    applyTheme(resolved);
    localStorage.setItem("themePreference", pref);
  };

  // Backward-compatible toggle — flips between light/dark explicitly
  // (leaves "system" mode if it was active).
  const toggleTheme = () => {
    setPreference(theme === "dark" ? "light" : "dark");
  };

  // Flash of wrong theme se bachne ke liye, mount hone tak render mat karo
  if (!mounted) return null;

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
