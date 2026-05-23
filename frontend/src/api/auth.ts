import { request } from "./client";
import type { LoginPayload, SessionPayload, SignupPayload } from "../types/auth";

export function getSession() {
  return request<SessionPayload>("/auth/session");
}

export function signup(payload: SignupPayload) {
  return request<SessionPayload>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: LoginPayload) {
  return request<SessionPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return request<SessionPayload>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

