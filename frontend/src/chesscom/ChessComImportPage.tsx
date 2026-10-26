import { useState } from "react";
import { importChessComStats } from "./api";
import type { ChessComStats } from "./types";
import "./ChessCom.css";

export function ChessComImportPage() {
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState<ChessComStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    setStats(null);
    try {
      setStats(await importChessComStats(username.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import that player's games");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chess.com stats</h1>
          <p className="page-subtitle">
            Counts a player's Chess960 results from their public Chess.com games over their last{" "}
            {stats?.monthsScanned ?? "few"} months of activity
          </p>
        </div>
      </div>

      <div className="page-card-simple">
        <div className="chesscom-form input-row">
          <input
            className="text-input"
            type="text"
            placeholder="Chess.com username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImport()}
          />
          <button className="primary-button" onClick={handleImport} disabled={loading}>
            {loading ? "Importing..." : "Import"}
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        {stats && (
          <div className="chesscom-stats">
            {stats.totalGames === 0 ? (
              <p className="muted">
                No Chess960 games found for {stats.username} in the last {stats.monthsScanned}{" "}
                months.
              </p>
            ) : (
              <>
                <div className="chesscom-summary">
                  <div>
                    <span className="chesscom-number">{stats.totalGames}</span>
                    <span>games</span>
                  </div>
                  <div>
                    <span className="chesscom-number">{stats.wins}</span>
                    <span>wins</span>
                  </div>
                  <div>
                    <span className="chesscom-number">{stats.draws}</span>
                    <span>draws</span>
                  </div>
                  <div>
                    <span className="chesscom-number">{stats.losses}</span>
                    <span>losses</span>
                  </div>
                  <div>
                    <span className="chesscom-number">{(stats.winRate * 100).toFixed(0)}%</span>
                    <span>win rate</span>
                  </div>
                </div>
                <dl className="chesscom-time-classes">
                  {Object.entries(stats.gamesByTimeClass).map(([timeClass, count]) => (
                    <div key={timeClass}>
                      <dt>{timeClass}</dt>
                      <dd>{count}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
