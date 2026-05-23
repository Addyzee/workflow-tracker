import type { AllowedAction } from "../types/application";

interface ActionButtonsProps {
  actions: AllowedAction[];
  isBusy: boolean;
  onEdit: () => void;
  onSubmit: () => void;
  onStartReview: () => void;
  onDecision: (action: "approve" | "request_more_info" | "reject") => void;
}

const LABELS: Record<AllowedAction, string> = {
  edit: "Edit",
  submit: "Submit",
  start_review: "Start review",
  approve: "Approve",
  request_more_info: "Need more information",
  reject: "Reject",
  resubmit: "Resubmit",
};

export default function ActionButtons({
  actions,
  isBusy,
  onEdit,
  onSubmit,
  onStartReview,
  onDecision,
}: ActionButtonsProps) {
  if (actions.length === 0) {
    return <p className="empty-actions">No further actions are available for this application.</p>;
  }

  return (
    <div className="action-row">
      {actions.map((action) => {
        if (action === "edit") {
          return (
            <button key={action} type="button" className="button-secondary" disabled={isBusy} onClick={onEdit}>
              {LABELS[action]}
            </button>
          );
        }

        if (action === "submit" || action === "resubmit") {
          return (
            <button key={action} type="button" className="button-primary" disabled={isBusy} onClick={onSubmit}>
              {LABELS[action]}
            </button>
          );
        }

        if (action === "start_review") {
          return (
            <button
              key={action}
              type="button"
              className="button-primary"
              disabled={isBusy}
              onClick={onStartReview}
            >
              {LABELS[action]}
            </button>
          );
        }

        return (
          <button
            key={action}
            type="button"
            className={action === "reject" ? "button-danger" : "button-secondary"}
            disabled={isBusy}
            onClick={() => onDecision(action)}
          >
            {LABELS[action]}
          </button>
        );
      })}
    </div>
  );
}

