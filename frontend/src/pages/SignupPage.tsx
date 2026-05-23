import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  USER_ROLES,
  type UserRole,
} from "../types/auth";
import {
  cardTitleClass,
  cn,
  errorPanelClass,
  inputClass,
  labelClass,
  linkUnderlineClass,
  panelClass,
  panelPaddingClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  selectClass,
} from "../lib/ui";

export default function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signup } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(USER_ROLES[0]);
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <p className={panelPaddingClass}>Loading session...</p>;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signup({
        display_name: displayName,
        email,
        password,
        password_confirm: passwordConfirm,
        role,
        company_name: companyName,
      });
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to create the account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div>
        <p className={labelClass}>Sign up</p>
        <h2 className={sectionTitleClass}>Create an applicant or reviewer account</h2>
      </div>

      <div className={`${panelClass} max-w-2xl p-5`}>
        <div className="mb-6">
          <h3 className={cardTitleClass}>Profile</h3>
        </div>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#111111]">Display name</span>
              <input
                className={inputClass}
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>

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
              <span className="text-sm font-semibold text-[#111111]">Role</span>
              <select
                className={selectClass}
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                <option value="applicant">Applicant</option>
                <option value="reviewer">Reviewer</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#111111]">Company name</span>
              <input
                className={cn(inputClass, role === "reviewer" && "border-[#111111]")}
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
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

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#111111]">Confirm password</span>
              <input
                className={inputClass}
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
              />
            </label>
          </div>

          {errorMessage ? <p className={errorPanelClass}>{errorMessage}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button className={primaryButtonClass} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
            <Link className={secondaryButtonClass} to="/login">
              Log in
            </Link>
          </div>
        </form>
      </div>

      <p className="text-sm text-[#636366]">
        Already have an account?{" "}
        <Link className={linkUnderlineClass} to="/login">
          Log in
        </Link>
      </p>
    </section>
  );
}
