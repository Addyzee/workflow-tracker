from ninja import Schema


class SessionUserOut(Schema):
    email: str
    display_name: str
    role: str
    company_name: str


class SessionOut(Schema):
    authenticated: bool
    csrf_token: str
    user: SessionUserOut | None = None


class SignupIn(Schema):
    display_name: str
    email: str
    password: str
    password_confirm: str
    role: str
    company_name: str | None = None


class LoginIn(Schema):
    email: str
    password: str

