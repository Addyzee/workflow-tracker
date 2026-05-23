import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  cardTitleClass,
  errorPanelClass,
  inputClass,
  labelClass,
  linkUnderlineClass,
  panelClass,
  panelPaddingClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
} from "../lib/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  if (isLoading) {
    return <p className={panelPaddingClass}>Loading session...</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div>
        <p className={labelClass}>Log in</p>
        <h2 className={sectionTitleClass}>Access your workflow account</h2>
      </div>

      <div className={`${panelClass} max-w-2xl p-5`}>
        <div className="mb-6">
          <h3 className={cardTitleClass}>Account details</h3>
        </div>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#111111]">Email</span>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-[#111111]">Password</span>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? <p className={errorPanelClass}>{errorMessage}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className={primaryButtonClass} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Log in"}
            </button>
            <Link className={secondaryButtonClass} to="/signup">
              Sign up
            </Link>
          </div>
        </form>
      </div>

      <p className="text-sm text-[#636366]">
        Need an account?{" "}
        <Link className={linkUnderlineClass} to="/signup">
          Create one
        </Link>
      </p>
    </section>
  );
}
