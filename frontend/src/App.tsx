import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AccountPage } from "./account/AccountPage";
import { useAuth } from "./account/authContext";
import { AuthProvider } from "./account/AuthProvider";
import { ProgressPage } from "./account/ProgressPage";
import { AnalyzeTab } from "./analyze/AnalyzeTab";
import { ChessComImportPage } from "./chesscom/ChessComImportPage";
import { LearnTab } from "./learn/LearnTab";
import { CreateGameForm } from "./play/CreateGameForm";
import { GameView } from "./play/GameView";
import { PreferencesProvider } from "./preferences";
import { ThemeToggle } from "./ThemeToggle";
import "./App.css";

/** Signed in: name, progress, sign out. Guest: log in / sign up. */
function AccountMenu() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return (
      <div className="account-menu">
        <Link to="/login" state={{ from: location.pathname }}>
          <span className="secondary-button">Log in</span>
        </Link>
        <Link to="/signup" state={{ from: location.pathname }}>
          <span className="primary-button">Sign up</span>
        </Link>
      </div>
    );
  }
  return (
    <div className="account-menu">
      <span className="account-name">{user.displayName}</span>
      <Link to="/progress">
        <span className="secondary-button">Progress</span>
      </Link>
      <button type="button" className="secondary-button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}

const TABS = [
  { path: "/play", label: "Play" },
  { path: "/analyze", label: "Analyze" },
  { path: "/learn", label: "Learn" },
  { path: "/chesscom-import", label: "Chess.com stats" },
];

const PAGE_NAMES: Record<string, string> = { "/login": "Log in", "/signup": "Sign up", "/progress": "Progress" };

function App() {
  const { pathname } = useLocation();
  const currentLabel = TABS.find((t) => pathname.startsWith(t.path))?.label ?? PAGE_NAMES[pathname];

  return (
    <PreferencesProvider>
      <AuthProvider>
        <div className="app">
          <header className="topbar">
            <span className="brand-logo" aria-hidden>
              960
            </span>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span>Chess960</span>
              {currentLabel && (
                <>
                  <span className="breadcrumb-sep" aria-hidden>
                    ›
                  </span>
                  <span className="breadcrumb-current">{currentLabel}</span>
                </>
              )}
            </nav>
            <div className="topbar-actions">
              <AccountMenu />
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
              <Route path="/login" element={<AccountPage key="login" />} />
              <Route path="/signup" element={<AccountPage key="signup" />} />
              <Route path="/progress" element={<ProgressPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </PreferencesProvider>
  );
}

export default App;
