import axios, { type AxiosResponse } from "axios";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"
).replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

const pendingGetRequests = new Map<string, Promise<AxiosResponse<unknown>>>();

export function getApi(path: string) {
  const pendingRequest = pendingGetRequests.get(path);
  if (pendingRequest) return pendingRequest;

  const request = api.get<unknown>(path).finally(() => {
    if (pendingGetRequests.get(path) === request) {
      pendingGetRequests.delete(path);
    }
  });
  pendingGetRequests.set(path, request);
  return request;
}

export function getApiError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : "Request failed.";
  }
  const payload: unknown = error.response?.data;
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  if (error.response) return `Request failed (${error.response.status}).`;
  return error.message || "Unable to connect to the API.";
}
