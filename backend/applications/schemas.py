from datetime import datetime

from ninja import Schema


class ApplicationCreateIn(Schema):
    applicant_name: str
    applicant_email: str
    company_name: str
    application_type: str
    description: str


class ApplicationUpdateIn(Schema):
    applicant_name: str | None = None
    applicant_email: str | None = None
    company_name: str | None = None
    application_type: str | None = None
    description: str | None = None


class ApplicationDecisionIn(Schema):
    status: str
    reviewer_comment: str | None = None


class ApplicationSummaryOut(Schema):
    tracking_number: str
    applicant_name: str
    company_name: str
    application_type: str
    status: str
    created_at: datetime
    allowed_actions: list[str]


class ApplicationDetailOut(Schema):
    tracking_number: str
    applicant_name: str
    applicant_email: str
    company_name: str
    application_type: str
    description: str
    status: str
    reviewer_comment: str
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None
    reviewed_at: datetime | None
    allowed_actions: list[str]

