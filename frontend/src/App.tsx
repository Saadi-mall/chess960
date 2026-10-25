import { useEffect, useState } from "react";
import "./App.css";

type HealthStatus = { status: string; database: "up" | "down" };

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setError("Could not reach the backend"));
  }, []);

  return (
    <main className="scaffold">
      <h1>Chess960</h1>
      <p>
        {error && error}
        {!error && !health && "Checking backend..."}
        {health && `Backend: ${health.status}, database: ${health.database}`}
      </p>
    </main>
  );
}

export default App;
