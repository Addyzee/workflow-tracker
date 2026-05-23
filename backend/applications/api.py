from ninja import NinjaAPI, Router
from ninja.errors import HttpError

from .models import Application
from .schemas import (
    ApplicationCreateIn,
    ApplicationDecisionIn,
    ApplicationDetailOut,
    ApplicationSummaryOut,
    ApplicationUpdateIn,
)
from .services import (
    WorkflowError,
    create_draft,
    get_allowed_actions,
    record_decision,
    start_review,
    submit_application,
    update_editable_application,
)

api = NinjaAPI(title="Trendflow Workflow Tracker API")
router = Router(tags=["applications"])


def _get_application_or_404(tracking_number: str) -> Application:
    try:
        return Application.objects.get(tracking_number=tracking_number)
    except Application.DoesNotExist as exc:
        raise HttpError(404, "Application not found.") from exc


def _to_summary(application: Application) -> ApplicationSummaryOut:
    return ApplicationSummaryOut(
        tracking_number=application.tracking_number,
        applicant_name=application.applicant_name,
        company_name=application.company_name,
        application_type=application.application_type,
        status=application.status,
        created_at=application.created_at,
        allowed_actions=get_allowed_actions(application),
    )


def _to_detail(application: Application) -> ApplicationDetailOut:
    return ApplicationDetailOut(
        tracking_number=application.tracking_number,
        applicant_name=application.applicant_name,
        applicant_email=application.applicant_email,
        company_name=application.company_name,
        application_type=application.application_type,
        description=application.description,
        status=application.status,
        reviewer_comment=application.reviewer_comment,
        created_at=application.created_at,
        updated_at=application.updated_at,
        submitted_at=application.submitted_at,
        reviewed_at=application.reviewed_at,
        allowed_actions=get_allowed_actions(application),
    )


@router.post("/applications", response={201: ApplicationDetailOut})
def create_application(request, payload: ApplicationCreateIn):
    try:
        application = create_draft(payload.model_dump())
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return 201, _to_detail(application)


@router.get("/applications", response=list[ApplicationSummaryOut])
def list_applications(request):
    applications = Application.objects.all()
    return [_to_summary(application) for application in applications]


@router.get("/applications/{tracking_number}", response=ApplicationDetailOut)
def get_application(request, tracking_number: str):
    application = _get_application_or_404(tracking_number)
    return _to_detail(application)


@router.patch("/applications/{tracking_number}", response=ApplicationDetailOut)
def update_application(request, tracking_number: str, payload: ApplicationUpdateIn):
    application = _get_application_or_404(tracking_number)
    try:
        updated = update_editable_application(application, payload.model_dump())
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return _to_detail(updated)


@router.post("/applications/{tracking_number}/submit", response=ApplicationDetailOut)
def submit_application_route(request, tracking_number: str):
    application = _get_application_or_404(tracking_number)
    try:
        submitted = submit_application(application)
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return _to_detail(submitted)


@router.post("/applications/{tracking_number}/start-review", response=ApplicationDetailOut)
def start_review_route(request, tracking_number: str):
    application = _get_application_or_404(tracking_number)
    try:
        reviewed = start_review(application)
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return _to_detail(reviewed)


@router.post("/applications/{tracking_number}/decision", response=ApplicationDetailOut)
def record_decision_route(request, tracking_number: str, payload: ApplicationDecisionIn):
    application = _get_application_or_404(tracking_number)
    try:
        decided = record_decision(application, payload.status, payload.reviewer_comment)
    except WorkflowError as exc:
        raise HttpError(400, str(exc)) from exc
    return _to_detail(decided)


api.add_router("", router)
