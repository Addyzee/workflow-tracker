from typing import Any

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.core.validators import validate_email
from django.db import transaction
from django.middleware.csrf import get_token

from .models import UserProfile, UserRole

User = get_user_model()
ROLE_VALUES = {choice for choice, _ in UserRole.choices}


class AuthError(Exception):
    pass


def _clean_required_text(field_name: str, value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise AuthError(f"{field_name} is required.")
    return cleaned


def _normalize_email(value: str) -> str:
    cleaned = _clean_required_text("email", value).lower()
    try:
        validate_email(cleaned)
    except Exception as exc:  # pragma: no cover - Django raises ValidationError
        raise AuthError("email must be a valid email address.") from exc
    return cleaned


def _validate_role(value: str) -> str:
    if value not in ROLE_VALUES:
        raise AuthError("role must be applicant or reviewer.")
    return value


def get_user_profile(user) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "display_name": user.get_full_name() or user.email or user.username,
            "role": UserRole.APPLICANT,
            "company_name": "",
        },
    )
    return profile


@transaction.atomic
def create_user_account(data: dict[str, Any]):
    display_name = _clean_required_text("display_name", data["display_name"])
    email = _normalize_email(data["email"])
    password = data["password"]
    password_confirm = data["password_confirm"]
    role = _validate_role(data["role"])
    company_name = (data.get("company_name") or "").strip()

    if len(password) < 8:
        raise AuthError("password must be at least 8 characters long.")
    if password != password_confirm:
        raise AuthError("password_confirm must match password.")
    if role == UserRole.REVIEWER and not company_name:
        raise AuthError("company_name is required for reviewer accounts.")
    if User.objects.filter(email__iexact=email).exists():
        raise AuthError("An account with that email already exists.")

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
    )
    UserProfile.objects.create(
        user=user,
        display_name=display_name,
        role=role,
        company_name=company_name,
    )
    return user


def login_user(request, email: str, password: str):
    normalized_email = _normalize_email(email)
    user = authenticate(request, username=normalized_email, password=password)
    if user is None:
        raise AuthError("Invalid email or password.")
    login(request, user)
    return user


def logout_user(request) -> None:
    logout(request)


def build_session_payload(request) -> dict[str, Any]:
    csrf_token = get_token(request)
    if not request.user.is_authenticated:
        return {
            "authenticated": False,
            "csrf_token": csrf_token,
            "user": None,
        }

    profile = get_user_profile(request.user)
    return {
        "authenticated": True,
        "csrf_token": csrf_token,
        "user": {
            "email": request.user.email,
            "display_name": profile.display_name,
            "role": profile.role,
            "company_name": profile.company_name,
        },
    }

