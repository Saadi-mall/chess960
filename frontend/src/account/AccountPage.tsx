import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { SegmentedControl } from "../SegmentedControl";
import { useAuth } from "./authContext";
import "./Account.css";

type Mode = "login" | "signup";

/** Log in or create an account. Afterwards, goes back to wherever the user came from. */
export function AccountPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from ?? "/learn";
  const [mode, setMode] = useState<Mode>(location.pathname === "/signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // After sign-up: the address the confirmation link went to.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={returnTo} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await signIn(email, password);
        navigate(returnTo, { replace: true });
      } else {
        setSentTo(await signUp(email, password, displayName));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{mode === "login" ? "Log in" : "Create an account"}</h1>
          <p className="page-subtitle">Keep your daily-lesson streak and results across devices</p>
        </div>
      </div>

      <div className="page-card-simple account-card">
        {sentTo ? (
          <div className="account-sent">
            <h2>Check your email</h2>
            <p>
              We sent a confirmation link to <strong>{sentTo}</strong>. Open it to create your account -
              it works once and expires in 24 hours.
            </p>
            <p className="muted">
              Nothing there? Check your spam folder, or{" "}
              <button type="button" className="link-button" onClick={() => setSentTo(null)}>
                sign up again
              </button>{" "}
              to get a new link.
            </p>
          </div>
        ) : (
        <>
        <SegmentedControl
          aria-label="Log in or sign up"
          options={[
            { value: "login" as const, label: "Log in" },
            { value: "signup" as const, label: "Sign up" },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
        />

        <form className="account-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              <span>Display name</span>
              <input
                className="text-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                maxLength={40}
                required
              />
            </label>
          )}
          <label>
            <span>Email</span>
            <input
              className="text-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
            {mode === "signup" && <small className="muted">At least 8 characters.</small>}
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="big-button" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
          {mode === "signup" && (
            <small className="muted">We'll email you a link to confirm the address before the account is created.</small>
          )}
        </form>
        </>
        )}
      </div>
    </div>
  );
}
