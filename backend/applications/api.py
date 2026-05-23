from django.db.models import Prefetch
from ninja import NinjaAPI, Router
from ninja.errors import HttpError

from accounts.api import router as auth_router
from accounts.services import get_user_profile

from .models import Application, ApplicationReviewHistory
from .schemas import (
    ApplicationCreateIn,
    ApplicationDecisionIn,
    ApplicationDetailOut,
    ApplicationReviewHistoryOut,
    ApplicationSummaryOut,
    ApplicationUpdateIn,
)
from .services import (
    AuthorizationError,
    WorkflowError,
    can_view_application,
    create_draft,
    get_allowed_actions,
    list_applications_for_user,
    record_decision,
    start_review,
    submit_application,
    update_editable_application,
)

api = NinjaAPI(title="Trendflow Workflow Tracker API")
router = Router(tags=["applications"])


def _require_authenticated_user(request):
    if not request.user.is_authenticated:
        raise HttpError(401, "Authentication credentials were not provided.")
    return request.user


def _get_application_or_404(tracking_number: str, viewer) -> Application:
    try:
        application = (
            Application.objects.select_related("owner", "owner__profile")
            .prefetch_related(
                Prefetch(
                    "review_history",
                    queryset=ApplicationReviewHistory.objects.select_related("reviewer", "reviewer__profile"),
                )
            )
            .get(tracking_number=tracking_number)
        )
    except Application.DoesNotExist as exc:
        raise HttpError(404, "Application not found.") from exc
    if not can_view_application(application, viewer):
        raise HttpError(404, "Application not found.")
    return application


def _to_review_history(entry: ApplicationReviewHistory) -> ApplicationReviewHistoryOut:
    reviewer_name = "Legacy reviewer"
    reviewer_email = None
    reviewer_company_name = None
    if entry.reviewer_id:
        profile = get_user_profile(entry.reviewer)
        reviewer_name = profile.display_name
        reviewer_email = entry.reviewer.email
        reviewer_company_name = profile.company_name

    return ApplicationReviewHistoryOut(
        decision_status=entry.decision_status,
        comment=entry.comment,
        reviewer_name=reviewer_name,
        reviewer_email=reviewer_email,
        reviewer_company_name=reviewer_company_name,
        created_at=entry.created_at,
    )


def _to_summary(application: Application, viewer) -> ApplicationSummaryOut:
    return ApplicationSummaryOut(
        tracking_number=application.tracking_number,
        applicant_name=application.applicant_name,
        applicant_email=application.applicant_email,
        company_name=application.company_name,
        application_type=application.application_type,
        status=application.status,
        created_at=application.created_at,
        allowed_actions=get_allowed_actions(application, viewer),
    )


def _to_detail(application: Application, viewer) -> ApplicationDetailOut:
    return ApplicationDetailOut(
        tracking_number=application.tracking_number,
        applicant_name=application.applicant_name,
        applicant_email=application.applicant_email,
        company_name=application.company_name,
        application_type=application.application_type,
        description=application.description,
        status=application.status,
        created_at=application.created_at,
        updated_at=application.updated_at,
        submitted_at=application.submitted_at,
        reviewed_at=application.reviewed_at,
        allowed_actions=get_allowed_actions(application, viewer),
        review_history=[_to_review_history(entry) for entry in application.review_history.all()],
    )


@router.post("/applications", response={201: ApplicationDetailOut})
def create_application(request, payload: ApplicationCreateIn):
    user = _require_authenticated_user(request)
    try:
        application = create_draft(user, payload.model_dump())
    except AuthorizationError as exc:
        raise HttpError(403, str(exc)) from exc
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return 201, _to_detail(application, user)


@router.get("/applications", response=list[ApplicationSummaryOut])
def list_applications(
    request,
    search: str | None = None,
    status: str | None = None,
    application_type: str | None = None,
):
    user = _require_authenticated_user(request)
    try:
        applications = list_applications_for_user(user, search, status, application_type)
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return [_to_summary(application, user) for application in applications]


@router.get("/applications/{tracking_number}", response=ApplicationDetailOut)
def get_application(request, tracking_number: str):
    user = _require_authenticated_user(request)
    application = _get_application_or_404(tracking_number, user)
    return _to_detail(application, user)


@router.patch("/applications/{tracking_number}", response=ApplicationDetailOut)
def update_application(request, tracking_number: str, payload: ApplicationUpdateIn):
    user = _require_authenticated_user(request)
    application = _get_application_or_404(tracking_number, user)
    try:
        updated = update_editable_application(user, application, payload.model_dump())
    except AuthorizationError as exc:
        raise HttpError(403, str(exc)) from exc
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return _to_detail(updated, user)


@router.post("/applications/{tracking_number}/submit", response=ApplicationDetailOut)
def submit_application_route(request, tracking_number: str):
    user = _require_authenticated_user(request)
    application = _get_application_or_404(tracking_number, user)
    try:
        submitted = submit_application(user, application)
    except AuthorizationError as exc:
        raise HttpError(403, str(exc)) from exc
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return _to_detail(submitted, user)


@router.post("/applications/{tracking_number}/start-review", response=ApplicationDetailOut)
def start_review_route(request, tracking_number: str):
    user = _require_authenticated_user(request)
    application = _get_application_or_404(tracking_number, user)
    try:
        reviewed = start_review(user, application)
    except AuthorizationError as exc:
        raise HttpError(403, str(exc)) from exc
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return _to_detail(reviewed, user)


@router.post("/applications/{tracking_number}/decision", response=ApplicationDetailOut)
def record_decision_route(request, tracking_number: str, payload: ApplicationDecisionIn):
    user = _require_authenticated_user(request)
    application = _get_application_or_404(tracking_number, user)
    try:
        decided = record_decision(user, application, payload.status, payload.reviewer_comment)
    except AuthorizationError as exc:
        raise HttpError(403, str(exc)) from exc
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return _to_detail(decided, user)


api.add_router("/auth", auth_router)
api.add_router("", router)
