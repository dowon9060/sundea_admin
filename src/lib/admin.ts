import { apiRequest } from "@/lib/api-client";
import type {
  AdminStoreDetail,
  AdminStoreListResponse,
  CreateStorePayload,
  RegionCount,
  RegistrationRequest,
  UpdateStorePayload,
} from "@/lib/types";

export function adminListStores(
  adminKey: string,
  query: Record<string, string | number | undefined> = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return apiRequest<AdminStoreListResponse>(
    `admin/stores${qs ? `?${qs}` : ""}`,
    { adminKey },
  );
}

export function adminGetStore(adminKey: string, id: string) {
  return apiRequest<AdminStoreDetail>(`admin/stores/${id}`, { adminKey });
}

export function adminCreateStore(adminKey: string, body: CreateStorePayload) {
  return apiRequest<AdminStoreDetail>("admin/stores", {
    method: "POST",
    adminKey,
    body: JSON.stringify(body),
  });
}

export function adminUpdateStore(
  adminKey: string,
  id: string,
  body: UpdateStorePayload,
) {
  return apiRequest<AdminStoreDetail>(`admin/stores/${id}`, {
    method: "PATCH",
    adminKey,
    body: JSON.stringify(body),
  });
}

export function adminUpdateHours(
  adminKey: string,
  id: string,
  hours: Array<{
    day_of_week: number;
    open_time?: string | null;
    close_time?: string | null;
    is_closed: boolean;
  }>,
) {
  return apiRequest<{ hours: unknown }>(`admin/stores/${id}/hours`, {
    method: "PATCH",
    adminKey,
    body: JSON.stringify({ hours }),
  });
}

export function adminListRegions(adminKey: string) {
  return apiRequest<RegionCount[]>("admin/regions", { adminKey });
}

export function adminListRegistrationRequests(
  adminKey: string,
  query: { status?: string; page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiRequest<{
    items: RegistrationRequest[];
    total: number;
    page: number;
    limit: number;
  }>(`admin/registration-requests${qs ? `?${qs}` : ""}`, { adminKey });
}
