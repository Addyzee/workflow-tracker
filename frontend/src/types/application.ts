export const APPLICATION_TYPES = [
  "Recordation",
  "Renewal",
  "Change of Ownership",
  "Change of Name",
  "Discontinuation",
] as const;

export const REVIEW_DECISIONS = [
  "Approved",
  "Need More Information",
  "Rejected",
] as const;

export type ApplicationType = (typeof APPLICATION_TYPES)[number];
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export type AllowedAction =
  | "edit"
  | "submit"
  | "start_review"
  | "approve"
  | "request_more_info"
  | "reject"
  | "resubmit";

export interface ApplicationFormValues {
  applicant_name: string;
  applicant_email: string;
  company_name: string;
  application_type: ApplicationType;
  description: string;
}

export interface ApplicationSummary {
  tracking_number: string;
  applicant_name: string;
  applicant_email: string;
  company_name: string;
  application_type: string;
  status: string;
  created_at: string;
  allowed_actions: AllowedAction[];
}

export interface ReviewHistoryEntry {
  decision_status: string;
  comment: string;
  reviewer_name: string;
  reviewer_email: string | null;
  reviewer_company_name: string | null;
  created_at: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  description: string;
  updated_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_history: ReviewHistoryEntry[];
}

export interface DecisionPayload {
  status: ReviewDecision;
  reviewer_comment?: string;
}

export interface ApplicationListFilters {
  search?: string;
  status?: string;
  application_type?: string;
}
