from typing import Any

from django.core.validators import validate_email
from django.db.models import Q
from django.utils import timezone

from accounts.models import UserRole
from accounts.services import get_user_profile

from .models import Application, ApplicationReviewHistory, ApplicationStatus, ApplicationType

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
APPLICATION_STATUS_VALUES = {choice for choice, _ in ApplicationStatus.choices}


class WorkflowError(Exception):
    pass


class AuthorizationError(Exception):
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


def _validate_status(value: str) -> str:
    if value not in APPLICATION_STATUS_VALUES:
        raise WorkflowError("status must be one of the supported application statuses.")
    return value


def _user_role(user) -> str:
    return get_user_profile(user).role


def _is_reviewer(user) -> bool:
    return _user_role(user) == UserRole.REVIEWER


def can_view_application(application: Application, user) -> bool:
    return _is_reviewer(user) or application.owner_id == user.id


def create_draft(owner, data: dict[str, Any]) -> Application:
    if _is_reviewer(owner):
        raise AuthorizationError("Only applicants can create applications.")

    return Application.objects.create(
        owner=owner,
        applicant_name=_clean_required_text("applicant_name", data["applicant_name"]),
        applicant_email=_validate_email_address(data["applicant_email"]),
        company_name=_clean_required_text("company_name", data["company_name"]),
        application_type=_validate_application_type(data["application_type"]),
        description=_clean_required_text("description", data["description"]),
        status=ApplicationStatus.DRAFT,
    )


def update_editable_application(user, application: Application, data: dict[str, Any]) -> Application:
    if application.owner_id != user.id or _is_reviewer(user):
        raise AuthorizationError("Only the owning applicant can edit this application.")

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


def submit_application(user, application: Application) -> Application:
    if application.owner_id != user.id or _is_reviewer(user):
        raise AuthorizationError("Only the owning applicant can submit this application.")

    if application.status not in {ApplicationStatus.DRAFT, ApplicationStatus.NEED_MORE_INFORMATION}:
        raise WorkflowError("Only Draft or Need More Information applications can be submitted.")

    application.status = ApplicationStatus.SUBMITTED
    application.submitted_at = timezone.now()
    application.save(update_fields=["status", "submitted_at", "updated_at"])
    return application


def start_review(user, application: Application) -> Application:
    if not _is_reviewer(user):
        raise AuthorizationError("Only reviewers can start review.")

    if application.status != ApplicationStatus.SUBMITTED:
        raise WorkflowError("Only Submitted applications can move to Under Review.")

    application.status = ApplicationStatus.UNDER_REVIEW
    application.save(update_fields=["status", "updated_at"])
    return application


def record_decision(
    user,
    application: Application,
    decision_status: str,
    reviewer_comment: str | None,
) -> Application:
    if not _is_reviewer(user):
        raise AuthorizationError("Only reviewers can record decisions.")

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
    application.reviewed_at = timezone.now()
    application.save(update_fields=["status", "reviewed_at", "updated_at"])
    ApplicationReviewHistory.objects.create(
        application=application,
        reviewer=user,
        decision_status=decision_status,
        comment=cleaned_comment,
    )
    return application


def get_allowed_actions(application: Application, user) -> list[str]:
    if _is_reviewer(user):
        if application.status == ApplicationStatus.SUBMITTED:
            return ["start_review"]
        if application.status == ApplicationStatus.UNDER_REVIEW:
            return ["approve", "request_more_info", "reject"]
        return []

    if application.owner_id != user.id:
        return []

    if application.status == ApplicationStatus.DRAFT:
        return ["edit", "submit"]
    if application.status == ApplicationStatus.NEED_MORE_INFORMATION:
        return ["edit", "resubmit"]
    return []


def list_applications_for_user(
    user,
    search: str | None = None,
    status: str | None = None,
    application_type: str | None = None,
):
    queryset = Application.objects.select_related("owner", "owner__profile").all()
    if not _is_reviewer(user):
        queryset = queryset.filter(owner=user)

    if search:
        cleaned_search = search.strip()
        if cleaned_search:
            queryset = queryset.filter(
                Q(tracking_number__icontains=cleaned_search)
                | Q(applicant_name__icontains=cleaned_search)
                | Q(applicant_email__icontains=cleaned_search)
                | Q(company_name__icontains=cleaned_search)
            )

    if status:
        queryset = queryset.filter(status=_validate_status(status))

    if application_type:
        queryset = queryset.filter(application_type=_validate_application_type(application_type))

    return queryset.order_by("-created_at")
