from typing import Any

from django.core.validators import validate_email
from django.utils import timezone

from .models import Application, ApplicationStatus, ApplicationType

EDITABLE_STATUSES = {
    ApplicationStatus.DRAFT,
    ApplicationStatus.NEED_MORE_INFORMATION,
}

DECISION_STATUSES = {
    ApplicationStatus.APPROVED,
    ApplicationStatus.NEED_MORE_INFORMATION,
    ApplicationStatus.REJECTED,
}

APPLICATION_TYPE_VALUES = {choice for choice, _ in ApplicationType.choices}


class WorkflowError(Exception):
    pass


def _clean_required_text(field_name: str, value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise WorkflowError(f"{field_name} is required.")
    return cleaned


def _validate_application_type(value: str) -> str:
    if value not in APPLICATION_TYPE_VALUES:
        raise WorkflowError("application_type must be one of the supported application types.")
    return value


def _validate_email_address(value: str) -> str:
    cleaned = _clean_required_text("applicant_email", value)
    try:
        validate_email(cleaned)
    except Exception as exc:  # pragma: no cover - Django raises ValidationError
        raise WorkflowError("applicant_email must be a valid email address.") from exc
    return cleaned


def create_draft(data: dict[str, Any]) -> Application:
    return Application.objects.create(
        applicant_name=_clean_required_text("applicant_name", data["applicant_name"]),
        applicant_email=_validate_email_address(data["applicant_email"]),
        company_name=_clean_required_text("company_name", data["company_name"]),
        application_type=_validate_application_type(data["application_type"]),
        description=_clean_required_text("description", data["description"]),
        status=ApplicationStatus.DRAFT,
    )


def update_editable_application(application: Application, data: dict[str, Any]) -> Application:
    if application.status not in EDITABLE_STATUSES:
        raise WorkflowError("Only Draft and Need More Information applications can be edited.")

    changed = False
    for field_name, value in data.items():
        if value is None:
            continue
        if field_name == "application_type":
            value = _validate_application_type(value)
        elif field_name == "applicant_email":
            value = _validate_email_address(value)
        else:
            value = _clean_required_text(field_name, value)
        setattr(application, field_name, value)
        changed = True

    if not changed:
        raise WorkflowError("Provide at least one field to update.")

    application.save()
    return application


def submit_application(application: Application) -> Application:
    if application.status not in {ApplicationStatus.DRAFT, ApplicationStatus.NEED_MORE_INFORMATION}:
        raise WorkflowError("Only Draft or Need More Information applications can be submitted.")

    application.status = ApplicationStatus.SUBMITTED
    application.submitted_at = timezone.now()
    application.save(update_fields=["status", "submitted_at", "updated_at"])
    return application


def start_review(application: Application) -> Application:
    if application.status != ApplicationStatus.SUBMITTED:
        raise WorkflowError("Only Submitted applications can move to Under Review.")

    application.status = ApplicationStatus.UNDER_REVIEW
    application.save(update_fields=["status", "updated_at"])
    return application


def record_decision(
    application: Application,
    decision_status: str,
    reviewer_comment: str | None,
) -> Application:
    if application.status != ApplicationStatus.UNDER_REVIEW:
        raise WorkflowError("Only Under Review applications can receive a reviewer decision.")

    if decision_status not in DECISION_STATUSES:
        raise WorkflowError("status must be Approved, Need More Information, or Rejected.")

    cleaned_comment = (reviewer_comment or "").strip()
    if decision_status in {
        ApplicationStatus.NEED_MORE_INFORMATION,
        ApplicationStatus.REJECTED,
    } and not cleaned_comment:
        raise WorkflowError("reviewer_comment is required for Need More Information or Rejected.")

    application.status = decision_status
    application.reviewer_comment = cleaned_comment
    application.reviewed_at = timezone.now()
    application.save(update_fields=["status", "reviewer_comment", "reviewed_at", "updated_at"])
    return application


def get_allowed_actions(application: Application) -> list[str]:
    if application.status == ApplicationStatus.DRAFT:
        return ["edit", "submit"]
    if application.status == ApplicationStatus.SUBMITTED:
        return ["start_review"]
    if application.status == ApplicationStatus.UNDER_REVIEW:
        return ["approve", "request_more_info", "reject"]
    if application.status == ApplicationStatus.NEED_MORE_INFORMATION:
        return ["edit", "resubmit"]
    return []

