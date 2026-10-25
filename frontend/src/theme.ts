export type Theme = "dark" | "light";

const KEY = "chess960:theme";

/** Dark is the default regardless of the OS preference - only an explicit, remembered
 * choice switches to light. */
export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // No persistence available - the choice just won't survive a refresh.
  }
}
