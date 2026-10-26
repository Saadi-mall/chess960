import { createContext, useContext } from "react";

export interface Preferences {
  showLegalMoves: boolean;
  animations: boolean;
  darkMode: boolean;
}

export interface PreferencesValue {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

export const DEFAULT_PREFERENCES: Preferences = { showLegalMoves: true, animations: true, darkMode: true };

// The default value is what components see without a provider (e.g. in unit tests).
export const PreferencesContext = createContext<PreferencesValue>({
  prefs: DEFAULT_PREFERENCES,
  setPref: () => {},
});

export function usePreferences(): PreferencesValue {
  return useContext(PreferencesContext);
}
