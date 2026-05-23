import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { listApplications } from "../api/applications";
import { ApiError } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import {
  APPLICATION_TYPES,
  type ApplicationSummary,
} from "../types/application";
import {
  cardTitleClass,
  inputClass,
  labelClass,
  panelClass,
  panelPaddingClass,
  primaryButtonClass,
  sectionTitleClass,
  selectClass,
  tableCellClass,
  tableHeadClass,
} from "../lib/ui";

const STATUS_OPTIONS = [
  "Draft",
  "Submitted",
  "Under Review",
  "Need More Information",
  "Approved",
  "Rejected",
] as const;

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default function ApplicationListPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [statusInput, setStatusInput] = useState(searchParams.get("status") ?? "");
  const [typeInput, setTypeInput] = useState(searchParams.get("application_type") ?? "");

  useEffect(() => {
    setSearchInput(searchParams.get("search") ?? "");
    setStatusInput(searchParams.get("status") ?? "");
    setTypeInput(searchParams.get("application_type") ?? "");
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      setIsLoading(true);
      try {
        const data = await listApplications({
          search: searchParams.get("search") ?? undefined,
          status: searchParams.get("status") ?? undefined,
          application_type: searchParams.get("application_type") ?? undefined,
        });
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
  }, [searchParams]);

  function applyFilters(next: { search?: string; status?: string; application_type?: string }) {
    const params = new URLSearchParams();
    if (next.search) {
      params.set("search", next.search);
    }
    if (next.status) {
      params.set("status", next.status);
    }
    if (next.application_type) {
      params.set("application_type", next.application_type);
    }
    setSearchParams(params);
  }

  function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters({
      search: searchInput.trim() || undefined,
      status: statusInput || undefined,
      application_type: typeInput || undefined,
    });
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={labelClass}>Applications</p>
          <h2 className={sectionTitleClass}>
            {user?.role === "reviewer" ? "Review queue" : "Your applications"}
          </h2>
        </div>
        {user?.role === "applicant" ? (
          <Link to="/applications/new" className={primaryButtonClass}>
            Create draft
          </Link>
        ) : null}
      </div>

      <form className={`${panelClass} grid gap-4 p-5 md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto_auto]`} onSubmit={handleFilterSubmit}>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#111111]">Search</span>
          <input
            className={inputClass}
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tracking number, applicant, email, company"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#111111]">Status</span>
          <select
            className={selectClass}
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[#111111]">Application type</span>
          <select
            className={selectClass}
            value={typeInput}
            onChange={(event) => setTypeInput(event.target.value)}
          >
            <option value="">All types</option>
            {APPLICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <button className={`${primaryButtonClass} self-end`} type="submit">
          Apply
        </button>

        <button
          className="self-end border-b border-[#111111] pb-1 text-sm text-[#111111]"
          type="button"
          onClick={() => {
            setSearchInput("");
            setStatusInput("");
            setTypeInput("");
            applyFilters({});
          }}
        >
          Clear
        </button>
      </form>

      {isLoading ? <p className={panelPaddingClass}>Loading applications...</p> : null}
      {errorMessage ? <p className="border border-[#efc9cf] bg-[#fff4f5] p-4 text-sm text-[#9c1c25]">{errorMessage}</p> : null}

      {!isLoading && !errorMessage ? (
        applications.length > 0 ? (
          <div className={`${panelClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="hidden md:table-header-group">
                  <tr>
                    <th className={tableHeadClass}>Tracking number</th>
                    <th className={tableHeadClass}>Applicant</th>
                    <th className={tableHeadClass}>Company</th>
                    <th className={tableHeadClass}>Application type</th>
                    <th className={tableHeadClass}>Status</th>
                    <th className={tableHeadClass}>Created date</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.tracking_number} className="block border-b border-[#d7d7db] md:table-row">
                      <td className={`${tableCellClass} block md:table-cell`} data-label="Tracking number">
                        <span className="mb-1 block text-[0.8rem] text-[#636366] md:hidden">Tracking number</span>
                        <Link className="border-b border-[#e4002b] text-[#e4002b]" to={`/applications/${application.tracking_number}`}>
                          {application.tracking_number}
                        </Link>
                      </td>
                      <td className={`${tableCellClass} block md:table-cell`} data-label="Applicant">
                        <span className="mb-1 block text-[0.8rem] text-[#636366] md:hidden">Applicant</span>
                        <div className="grid gap-1">
                          <span>{application.applicant_name}</span>
                          {user?.role === "reviewer" ? (
                            <span className="text-xs text-[#636366]">{application.applicant_email}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${tableCellClass} block md:table-cell`} data-label="Company">
                        <span className="mb-1 block text-[0.8rem] text-[#636366] md:hidden">Company</span>
                        {application.company_name}
                      </td>
                      <td className={`${tableCellClass} block md:table-cell`} data-label="Application type">
                        <span className="mb-1 block text-[0.8rem] text-[#636366] md:hidden">Application type</span>
                        {application.application_type}
                      </td>
                      <td className={`${tableCellClass} block md:table-cell`} data-label="Status">
                        <span className="mb-1 block text-[0.8rem] text-[#636366] md:hidden">Status</span>
                        <StatusBadge status={application.status} />
                      </td>
                      <td className={`${tableCellClass} block md:table-cell`} data-label="Created date">
                        <span className="mb-1 block text-[0.8rem] text-[#636366] md:hidden">Created date</span>
                        {formatDate(application.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={panelPaddingClass}>
            <h3 className={cardTitleClass}>No applications found</h3>
            <p className="mt-2 text-sm text-[#636366]">
              {user?.role === "reviewer"
                ? "No applications match the current filters."
                : "Create your first draft or adjust the current filters."}
            </p>
          </div>
        )
      ) : null}
    </section>
  );
}
