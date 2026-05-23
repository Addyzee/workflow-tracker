import { Link } from "react-router-dom";

import { AppRoutes } from "./routes";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="folio">Trendflow Assignment</p>
          <h1>Mini Application Workflow Tracker</h1>
        </div>
        <nav className="app-nav" aria-label="Primary">
          <Link to="/">Applications</Link>
          <Link to="/applications/new" className="nav-cta">
            New application
          </Link>
        </nav>
      </header>
      <main className="app-main">
        <AppRoutes />
      </main>
    </div>
  );
}

