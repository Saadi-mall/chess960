import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnalyzeTab } from "./analyze/AnalyzeTab";
import { ChessComImportPage } from "./chesscom/ChessComImportPage";
import { LearnTab } from "./learn/LearnTab";
import { CreateGameForm } from "./play/CreateGameForm";
import { GameView } from "./play/GameView";
import { PreferencesProvider } from "./preferences";
import { ThemeToggle } from "./ThemeToggle";
import "./App.css";

const TABS = [
  { path: "/play", label: "Play" },
  { path: "/analyze", label: "Analyze" },
  { path: "/learn", label: "Learn" },
  { path: "/chesscom-import", label: "Chess.com stats" },
];

function App() {
  const { pathname } = useLocation();
  const current = TABS.find((t) => pathname.startsWith(t.path));

  return (
    <PreferencesProvider>
      <div className="app">
        <header className="topbar">
          <span className="brand-logo" aria-hidden>
            960
          </span>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>Chess960</span>
            {current && (
              <>
                <span className="breadcrumb-sep" aria-hidden>
                  ›
                </span>
                <span className="breadcrumb-current">{current.label}</span>
              </>
            )}
          </nav>
          <div className="topbar-actions">
            <ThemeToggle />
          </div>
        </header>

        <nav className="tabbar">
          {TABS.map((tab) => (
            <NavLink key={tab.path} to={tab.path} className={({ isActive }) => (isActive ? "active" : "")}>
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/play" replace />} />
            <Route path="/play" element={<CreateGameForm />} />
            <Route path="/play/:gameId" element={<GameView />} />
            <Route path="/analyze" element={<AnalyzeTab />} />
            <Route path="/learn" element={<LearnTab />} />
            <Route path="/chesscom-import" element={<ChessComImportPage />} />
          </Routes>
        </main>
      </div>
    </PreferencesProvider>
  );
}

export default App;
