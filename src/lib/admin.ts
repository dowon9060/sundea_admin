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
  );
}

export function adminGetStore(id: string) {
  return apiRequest<AdminStoreDetail>(`admin/stores/${id}`);
}

export function adminCreateStore(body: CreateStorePayload) {
  return apiRequest<AdminStoreDetail>("admin/stores", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function adminUpdateStore(id: string, body: UpdateStorePayload) {
  return apiRequest<AdminStoreDetail>(`admin/stores/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function adminUpdateHours(
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
    body: JSON.stringify({ hours }),
  });
}

export function adminListRegions() {
  return apiRequest<RegionCount[]>("admin/regions");
}

export function adminListRegistrationRequests(
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
  }>(`admin/registration-requests${qs ? `?${qs}` : ""}`);
}
