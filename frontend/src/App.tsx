import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import {
  headerTitleClass,
  labelClass,
  linkUnderlineClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./lib/ui";
import { AppRoutes } from "./routes";

export default function App() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className='min-h-screen bg-[#f7f7f8] font-["Helvetica_Neue",Helvetica,Arial,sans-serif] text-[#111111]'>
      <div className="pointer-events-none fixed inset-0 -z-10 hidden bg-[#f7f7f8] md:block">
        <div className="mx-auto grid h-full max-w-[1180px] grid-cols-4 px-4">
          <div className="border-l border-black/5" />
          <div className="border-l border-black/5" />
          <div className="border-l border-black/5" />
          <div className="border-x border-black/5" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6">
        <header className="flex flex-col gap-6 border-b border-[#d7d7db] pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className={labelClass}>Application tracker</p>
            <h1 className={headerTitleClass}>Mini Application Workflow Tracker</h1>
          </div>

          <div className="flex max-w-md flex-col gap-4 md:items-end">
            {isAuthenticated && user ? (
              <div className="text-sm leading-6 text-[#636366]">
                <p className="m-0 font-semibold text-[#111111]">{user.display_name}</p>
                <p className="m-0">
                  {user.role === "reviewer" ? "Reviewer" : "Applicant"}
                  {user.company_name ? ` · ${user.company_name}` : ""}
                </p>
              </div>
            ) : null}

            <nav className="flex flex-wrap gap-3" aria-label="Primary">
              {isAuthenticated ? (
                <>
                  <Link className={linkUnderlineClass} to="/">
                    Applications
                  </Link>
                  {user?.role === "applicant" ? (
                    <Link className={linkUnderlineClass} to="/applications/new">
                      Create
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      void handleLogout();
                    }}
                    disabled={isLoading}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link className={secondaryButtonClass} to="/login">
                    Log in
                  </Link>
                  <Link className={primaryButtonClass} to="/signup">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="pt-6">
        <AppRoutes />
        </main>
      </div>
    </div>
  );
}
