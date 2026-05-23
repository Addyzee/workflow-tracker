export const USER_ROLES = ["applicant", "reviewer"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface SessionUser {
  email: string;
  display_name: string;
  role: UserRole;
  company_name: string;
}

export interface SessionPayload {
  authenticated: boolean;
  csrf_token: string;
  user: SessionUser | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  display_name: string;
  email: string;
  password: string;
  password_confirm: string;
  role: UserRole;
  company_name?: string;
}

