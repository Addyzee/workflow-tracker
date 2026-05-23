import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getApplication,
  recordDecision,
  startReview,
  submitApplication,
} from "../api/applications";
import { ApiError } from "../api/client";
import ActionButtons from "../components/ActionButtons";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import {
  cardTitleClass,
  errorPanelClass,
  labelClass,
  linkUnderlineClass,
  panelClass,
  panelPaddingClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
  successPanelClass,
  textareaClass,
} from "../lib/ui";
import type { ApplicationDetail, ReviewDecision } from "../types/application";

type DecisionAction = "approve" | "request_more_info" | "reject";

const DECISION_MAP: Record<DecisionAction, ReviewDecision> = {
  approve: "Approved",
  request_more_info: "Need More Information",
  reject: "Rejected",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ApplicationDetailPage() {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<ReviewDecision | null>(null);
  const [reviewerComment, setReviewerComment] = useState("");

  useEffect(() => {
    if (!trackingNumber) {
      setIsLoading(false);
      setErrorMessage("Application not found.");
      return;
    }

    const trackingId = trackingNumber;
    let active = true;

    async function loadApplication() {
      setIsLoading(true);
      try {
        const data = await getApplication(trackingId);
        if (active) {
          setApplication(data);
          setErrorMessage(null);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof ApiError ? error.message : "Unable to load the application.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadApplication();

    return () => {
      active = false;
    };
  }, [trackingNumber]);

  async function runTransition(callback: () => Promise<ApplicationDetail>, successCopy: string) {
    setIsWorking(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await callback();
      setApplication(updated);
      setDecisionStatus(null);
      setReviewerComment("");
      setSuccessMessage(successCopy);
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Unable to update the application.");
    } finally {
      setIsWorking(false);
    }
  }

  function openDecision(action: DecisionAction) {
    setDecisionStatus(DECISION_MAP[action]);
    setReviewerComment("");
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handleDecisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application || !decisionStatus) {
      return;
    }

    const trimmedComment = reviewerComment.trim();
    const commentRequired = decisionStatus !== "Approved";

    if (commentRequired && !trimmedComment) {
      setErrorMessage("Reviewer comment is required for this decision.");
      return;
    }

    await runTransition(
      () =>
        recordDecision(application.tracking_number, {
          status: decisionStatus,
          reviewer_comment: trimmedComment || undefined,
        }),
      `Decision recorded: ${decisionStatus}.`,
    );
  }

  if (isLoading) {
    return <p className={panelPaddingClass}>Loading application...</p>;
  }

  if (errorMessage && !application) {
    return <p className={errorPanelClass}>{errorMessage}</p>;
  }

  if (!application) {
    return <p className={errorPanelClass}>Application not found.</p>;
  }

  return (
    <section className="grid gap-5">
      <div>
        <p className={labelClass}>Detail</p>
        <h2 className={sectionTitleClass}>Application detail</h2>
      </div>

      <div className={`${panelClass} grid gap-5 p-5`}>
        <p className="m-0 text-[clamp(2.8rem,10vw,7rem)] leading-[0.9] tracking-[-0.07em] text-balance text-[#111111]">
          {application.tracking_number}
        </p>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div>
            <h3 className={cardTitleClass}>{application.company_name}</h3>
            <p className="mt-2 text-sm text-[#636366]">
              {application.applicant_name}
              {user?.role === "reviewer" ? ` · ${application.applicant_email}` : ""}
            </p>
          </div>
          <StatusBadge status={application.status} />
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButtons
            actions={application.allowed_actions}
            isBusy={isWorking}
            onEdit={() => navigate(`/applications/${application.tracking_number}/edit`)}
            onSubmit={() =>
              runTransition(
                () => submitApplication(application.tracking_number),
                application.allowed_actions.includes("resubmit")
                  ? "Application resubmitted."
                  : "Application submitted.",
              )
            }
            onStartReview={() =>
              runTransition(
                () => startReview(application.tracking_number),
                "Application moved to Under Review.",
              )
            }
            onDecision={openDecision}
          />
        </div>
        {successMessage ? <p className={successPanelClass}>{successMessage}</p> : null}
        {errorMessage ? <p className={errorPanelClass}>{errorMessage}</p> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className={`${panelClass} p-5`}>
          <h3 className={cardTitleClass}>Application details</h3>
          <dl className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <dt className="mb-1 text-[0.8rem] text-[#636366]">Applicant email</dt>
              <dd className="m-0 text-sm text-[#111111]">{application.applicant_email}</dd>
            </div>
            <div>
              <dt className="mb-1 text-[0.8rem] text-[#636366]">Application type</dt>
              <dd className="m-0 text-sm text-[#111111]">{application.application_type}</dd>
            </div>
            <div>
              <dt className="mb-1 text-[0.8rem] text-[#636366]">Created</dt>
              <dd className="m-0 text-sm text-[#111111]">{formatDateTime(application.created_at)}</dd>
            </div>
            <div>
              <dt className="mb-1 text-[0.8rem] text-[#636366]">Updated</dt>
              <dd className="m-0 text-sm text-[#111111]">{formatDateTime(application.updated_at)}</dd>
            </div>
            <div>
              <dt className="mb-1 text-[0.8rem] text-[#636366]">Submitted</dt>
              <dd className="m-0 text-sm text-[#111111]">{formatDateTime(application.submitted_at)}</dd>
            </div>
            <div>
              <dt className="mb-1 text-[0.8rem] text-[#636366]">Reviewed</dt>
              <dd className="m-0 text-sm text-[#111111]">{formatDateTime(application.reviewed_at)}</dd>
            </div>
          </dl>
        </div>

        <div className={`${panelClass} p-5`}>
          <h3 className={cardTitleClass}>Description</h3>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#636366]">{application.description}</p>
        </div>
      </div>

      <div className={`${panelClass} p-5`}>
        <h3 className={cardTitleClass}>Review history</h3>
        {application.review_history.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {application.review_history.map((entry, index) => (
              <div
                key={`${entry.created_at}-${index}`}
                className="grid gap-3 border-t border-[#d7d7db] pt-4 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="m-0 text-sm font-semibold text-[#111111]">{entry.reviewer_name}</p>
                    <p className="m-0 text-sm text-[#636366]">
                      {[entry.reviewer_email, entry.reviewer_company_name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <StatusBadge status={entry.decision_status} />
                    <p className="m-0 text-xs text-[#636366]">{formatDateTime(entry.created_at)}</p>
                  </div>
                </div>
                <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-[#636366]">
                  {entry.comment || "No reviewer comment."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#636366]">No reviewer decisions have been recorded yet.</p>
        )}
      </div>

      {decisionStatus && user?.role === "reviewer" ? (
        <div className={`${panelClass} p-5`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className={labelClass}>Decision</p>
              <h3 className={cardTitleClass}>{decisionStatus}</h3>
            </div>
            <button type="button" className={secondaryButtonClass} onClick={() => setDecisionStatus(null)}>
              Cancel
            </button>
          </div>
          <form className="mt-5 grid gap-5" onSubmit={handleDecisionSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#111111]">Reviewer comment</span>
              <textarea
                className={textareaClass}
                rows={5}
                value={reviewerComment}
                onChange={(event) => setReviewerComment(event.target.value)}
                placeholder={
                  decisionStatus === "Approved" ? "Optional comment" : "Required reviewer comment"
                }
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className={primaryButtonClass} disabled={isWorking}>
                {isWorking ? "Saving..." : "Record decision"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <Link to="/" className={linkUnderlineClass}>
        Back to applications
      </Link>
    </section>
  );
}
