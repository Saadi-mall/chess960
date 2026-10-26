import { useState, type ReactNode } from "react";
import { DEFAULT_PREFERENCES, PreferencesContext, type Preferences } from "./preferencesContext";
import { applyTheme, getStoredTheme } from "./theme";

const KEY = "chess960:preferences";

function load(): Preferences {
  let stored: Partial<Preferences> = {};
  try {
    stored = JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    // Unreadable or unavailable storage - fall back to the defaults.
  }
  return { ...DEFAULT_PREFERENCES, ...stored, darkMode: getStoredTheme() === "dark" };
}

/** Per-browser display preferences, shown as the toggles under every tab's controls. */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load);

  function setPref<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (key === "darkMode") applyTheme(value ? "dark" : "light");
    try {
      localStorage.setItem(KEY, JSON.stringify({ showLegalMoves: next.showLegalMoves, animations: next.animations }));
    } catch {
      // No persistence available - the choice just won't survive a refresh.
    }
  }

  return <PreferencesContext.Provider value={{ prefs, setPref }}>{children}</PreferencesContext.Provider>;
}
