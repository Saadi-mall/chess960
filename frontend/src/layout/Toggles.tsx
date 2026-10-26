import { usePreferences } from "../preferencesContext";

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={checked ? "switch switch-on" : "switch"}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

/** The display toggles at the bottom of every tab's left column. */
export function PreferenceToggles() {
  const { prefs, setPref } = usePreferences();
  return (
    <div className="toggles">
      <Switch label="Show legal moves" checked={prefs.showLegalMoves} onChange={(v) => setPref("showLegalMoves", v)} />
      <Switch label="Enable animations" checked={prefs.animations} onChange={(v) => setPref("animations", v)} />
      <Switch label="Dark mode" checked={prefs.darkMode} onChange={(v) => setPref("darkMode", v)} />
    </div>
  );
}
