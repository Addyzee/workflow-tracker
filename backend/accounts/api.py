from ninja import Router
from ninja.errors import HttpError

from .schemas import LoginIn, SessionOut, SignupIn
from .services import AuthError, build_session_payload, create_user_account, login_user, logout_user

router = Router(tags=["auth"])


@router.get("/session", response=SessionOut)
def get_session(request):
    return build_session_payload(request)


@router.post("/signup", response={201: SessionOut})
def signup(request, payload: SignupIn):
    try:
        user = create_user_account(payload.model_dump())
    except AuthError as exc:
        raise HttpError(400, str(exc)) from exc

    login_user(request, user.email, payload.password)
    return 201, build_session_payload(request)


@router.post("/login", response=SessionOut)
def login_route(request, payload: LoginIn):
    try:
        login_user(request, payload.email, payload.password)
    except AuthError as exc:
        raise HttpError(401, str(exc)) from exc
    return build_session_payload(request)


@router.post("/logout", response=SessionOut)
def logout_route(request):
    logout_user(request)
    return build_session_payload(request)

