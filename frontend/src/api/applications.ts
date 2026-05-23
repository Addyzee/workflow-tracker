import { request } from "./client";
import type {
  ApplicationDetail,
  ApplicationFormValues,
  ApplicationSummary,
  DecisionPayload,
} from "../types/application";

export function listApplications() {
  return request<ApplicationSummary[]>("/applications");
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

