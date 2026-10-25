import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AnalyzeTab } from "./analyze/AnalyzeTab";
import { ChessComImportPage } from "./chesscom/ChessComImportPage";
import { LearnTab } from "./learn/LearnTab";
import { CreateGameForm } from "./play/CreateGameForm";
import { GameView } from "./play/GameView";
import { ThemeToggle } from "./ThemeToggle";
import "./App.css";

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Chess960</h1>
        <nav className="tabs">
          <NavLink to="/play" className={({ isActive }) => (isActive ? "active" : "")}>
            Play
          </NavLink>
          <NavLink to="/analyze" className={({ isActive }) => (isActive ? "active" : "")}>
            Analyze
          </NavLink>
          <NavLink to="/learn" className={({ isActive }) => (isActive ? "active" : "")}>
            Learn
          </NavLink>
        </nav>
        <ThemeToggle />
      </header>

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
  );
}

export default App;
