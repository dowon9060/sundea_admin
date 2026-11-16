import { ApiError } from "@/lib/api-error";

const PREFIX = "/api/backend";

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("서버 응답을 해석할 수 없습니다.", res.status);
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { adminKey?: string | null } = {},
): Promise<T> {
  const { adminKey, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  if (!headers.has("Content-Type") && rest.body) {
    headers.set("Content-Type", "application/json");
  }
  if (adminKey) {
    headers.set("X-Admin-Key", adminKey);
  }

  const res = await fetch(`${PREFIX}/${path}`, { ...rest, headers });
  const json = (await parseJson(res)) as
    | { data?: T; error?: string; message?: string }
    | null;

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && typeof json.error === "string" && json.error) ||
      (json && typeof json === "object" && typeof json.message === "string" && json.message) ||
      "요청에 실패했습니다.";
    throw new ApiError(message, res.status);
  }

  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  throw new ApiError("알 수 없는 응답 형식입니다.", res.status);
}
