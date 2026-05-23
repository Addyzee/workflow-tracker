import { request } from "./client";
import type {
  ApplicationDetail,
  ApplicationFormValues,
  ApplicationListFilters,
  ApplicationSummary,
  DecisionPayload,
} from "../types/application";

export function listApplications(filters?: ApplicationListFilters) {
  const searchParams = new URLSearchParams();
  if (filters?.search) {
    searchParams.set("search", filters.search);
  }
  if (filters?.status) {
    searchParams.set("status", filters.status);
  }
  if (filters?.application_type) {
    searchParams.set("application_type", filters.application_type);
  }

  const query = searchParams.toString();
  return request<ApplicationSummary[]>(`/applications${query ? `?${query}` : ""}`);
}

export function getApplication(trackingNumber: string) {
  return request<ApplicationDetail>(`/applications/${trackingNumber}`);
}

export function createApplication(payload: ApplicationFormValues) {
  return request<ApplicationDetail>("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateApplication(trackingNumber: string, payload: ApplicationFormValues) {
  return request<ApplicationDetail>(`/applications/${trackingNumber}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function submitApplication(trackingNumber: string) {
  return request<ApplicationDetail>(`/applications/${trackingNumber}/submit`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function startReview(trackingNumber: string) {
  return request<ApplicationDetail>(`/applications/${trackingNumber}/start-review`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function recordDecision(trackingNumber: string, payload: DecisionPayload) {
  return request<ApplicationDetail>(`/applications/${trackingNumber}/decision`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
