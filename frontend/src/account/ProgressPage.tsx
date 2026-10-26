import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fetchProgress, type Progress } from "./api";
import { useAuth } from "./authContext";
import "./Account.css";

export function ProgressPage() {
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchProgress().then(setProgress, (e) => setError(e instanceof Error ? e.message : "Could not load progress"));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: "/progress" }} />;

  const stats = progress && [
    { label: "Current streak", value: `${progress.currentStreak} day${progress.currentStreak === 1 ? "" : "s"}` },
    { label: "Longest streak", value: `${progress.longestStreak} day${progress.longestStreak === 1 ? "" : "s"}` },
    { label: "Lessons finished", value: progress.lessonsCompleted },
    { label: "Weakest pawns found", value: `${progress.weakestPawnsFound}/${progress.lessonsCompleted}` },
    { label: "Best moves found", value: `${progress.bestMovesFound}/${progress.lessonsCompleted * 6}` },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{user.displayName}'s progress</h1>
          <p className="page-subtitle">Daily lessons you've finished while signed in</p>
        </div>
      </div>

      <div className="page-card-simple">
        {error && <p className="error-text">{error}</p>}
        {stats && (
          <div className="stat-grid">
            {stats.map((s) => (
              <div key={s.label} className="stat">
                <span className="stat-value">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {progress && progress.recent.length === 0 && (
          <p className="muted">
            No lessons yet. <Link to="/learn">Do today's lesson</Link> to start a streak.
          </p>
        )}
        {progress && progress.recent.length > 0 && (
          <table className="results-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Position</th>
                <th>Weakest pawn</th>
                <th>White's best moves</th>
                <th>Black's best replies</th>
              </tr>
            </thead>
            <tbody>
              {progress.recent.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>#{r.number}</td>
                  <td className={r.weakestPawnCorrect ? "success-text" : "error-cell"}>
                    {r.weakestPawnCorrect ? "Found" : "Missed"}
                  </td>
                  <td>{r.whiteFound}/3</td>
                  <td>{r.blackFound}/3</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
