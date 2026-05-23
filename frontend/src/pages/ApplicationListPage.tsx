import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { listApplications } from "../api/applications";
import { ApiError } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import type { ApplicationSummary } from "../types/application";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default function ApplicationListPage() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      setIsLoading(true);
      try {
        const data = await listApplications();
        if (active) {
          setApplications(data);
          setErrorMessage(null);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof ApiError ? error.message : "Unable to load applications.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page-grid">
      <div className="page-heading">
        <div>
          <p className="folio">01</p>
          <h2>Applications</h2>
        </div>
        <Link to="/applications/new" className="button-primary button-link">
          Create draft
        </Link>
      </div>

      {isLoading ? <p className="panel">Loading applications...</p> : null}
      {errorMessage ? <p className="panel error-panel">{errorMessage}</p> : null}

      {!isLoading && !errorMessage ? (
        applications.length > 0 ? (
          <div className="panel table-panel">
            <table className="application-table">
              <thead>
                <tr>
                  <th>Tracking number</th>
                  <th>Applicant name</th>
                  <th>Company name</th>
                  <th>Application type</th>
                  <th>Status</th>
                  <th>Created date</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.tracking_number}>
                    <td data-label="Tracking number">
                      <Link to={`/applications/${application.tracking_number}`}>
                        {application.tracking_number}
                      </Link>
                    </td>
                    <td data-label="Applicant name">{application.applicant_name}</td>
                    <td data-label="Company name">{application.company_name}</td>
                    <td data-label="Application type">{application.application_type}</td>
                    <td data-label="Status">
                      <StatusBadge status={application.status} />
                    </td>
                    <td data-label="Created date">{formatDate(application.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel empty-panel">
            <h3>No applications yet</h3>
            <p>Create the first draft to start the workflow.</p>
          </div>
        )
      ) : null}
    </section>
  );
}
