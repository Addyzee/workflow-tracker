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
    return <p className="panel">Loading application...</p>;
  }

  if (errorMessage && !application) {
    return <p className="panel error-panel">{errorMessage}</p>;
  }

  if (!application) {
    return <p className="panel error-panel">Application not found.</p>;
  }

  return (
    <section className="detail-layout">
      <div className="detail-hero panel">
        <p className="folio">04</p>
        <p className="tracking-hero">{application.tracking_number}</p>
        <div className="detail-title-row">
          <div>
            <h2>{application.company_name}</h2>
            <p>{application.applicant_name}</p>
          </div>
          <StatusBadge status={application.status} />
        </div>
        <div className="detail-actions">
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
        {successMessage ? <p className="success-panel">{successMessage}</p> : null}
        {errorMessage ? <p className="error-panel">{errorMessage}</p> : null}
      </div>

      <div className="detail-columns">
        <div className="panel">
          <h3>Application details</h3>
          <dl className="meta-grid">
            <div>
              <dt>Applicant email</dt>
              <dd>{application.applicant_email}</dd>
            </div>
            <div>
              <dt>Application type</dt>
              <dd>{application.application_type}</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{formatDateTime(application.created_at)}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(application.updated_at)}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{formatDateTime(application.submitted_at)}</dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>{formatDateTime(application.reviewed_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <h3>Description</h3>
          <p className="description-copy">{application.description}</p>
          {application.reviewer_comment ? (
            <>
              <h3>Reviewer comment</h3>
              <p className="description-copy">{application.reviewer_comment}</p>
            </>
          ) : null}
        </div>
      </div>

      {decisionStatus ? (
        <div className="panel decision-panel">
          <div className="decision-heading">
            <div>
              <p className="folio">Decision</p>
              <h3>{decisionStatus}</h3>
            </div>
            <button type="button" className="button-secondary" onClick={() => setDecisionStatus(null)}>
              Cancel
            </button>
          </div>
          <form onSubmit={handleDecisionSubmit}>
            <label className="form-textarea">
              <span>Reviewer comment</span>
              <textarea
                rows={5}
                value={reviewerComment}
                onChange={(event) => setReviewerComment(event.target.value)}
                placeholder={
                  decisionStatus === "Approved"
                    ? "Optional comment"
                    : "Required reviewer comment"
                }
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="button-primary" disabled={isWorking}>
                {isWorking ? "Saving..." : "Record decision"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <Link to="/" className="back-link">
        Back to applications
      </Link>
    </section>
  );
}
