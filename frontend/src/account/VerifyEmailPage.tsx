import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./authContext";
import "./Account.css";

/** Where the emailed sign-up link lands: confirms the address, which creates the account. */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(token ? null : "This link is missing its code.");
  // The link works once, so make sure StrictMode's double effect doesn't spend it twice.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;
    verifyEmail(token).then(
      () => navigate("/learn", { replace: true }),
      (e) => setError(e instanceof Error ? e.message : "Couldn't confirm that link"),
    );
  }, [token, verifyEmail, navigate]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Confirm your email</h1>
          <p className="page-subtitle">Finishing your sign-up</p>
        </div>
      </div>
      <div className="page-card-simple account-card">
        {error ? (
          <>
            <p className="error-text">{error}</p>
            <Link to="/signup">Sign up again</Link>
          </>
        ) : (
          <p className="muted">Confirming your email...</p>
        )}
      </div>
    </div>
  );
}
