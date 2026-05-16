import { NO_SESSION_SUBSTRING } from "./constants";
import { runAnonymousSignIn } from "./ensure-hidden-session";

// Fetch for `/events/*` with credentials. On 401 + no session, creates an anonymous
// Better Auth session once (invisible to the user) and retries the same request.

const base = import.meta.env.VITE_API_URL ?? "";

export async function apiFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const opts: RequestInit = { ...init, credentials: "include" };
  const href = typeof url === "string" ? url : url.toString();
  const fullUrl = `${base}${href}`;

  if (href.includes("/api/auth")) return fetch(fullUrl, opts);

  const first = await fetch(fullUrl, opts);
  if (first.status !== 401) return first;
  try {
    const payload = (await first.clone().json()) as { message?: string };
    if (!payload?.message?.includes(NO_SESSION_SUBSTRING)) return first;
  } catch {
    return first;
  }
  await runAnonymousSignIn();
  return fetch(fullUrl, opts);
}

export async function readApiData<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok) {
    const o = json as { message?: string };
    throw new Error(o?.message || `HTTP ${res.status}`);
  }
  return (json as { data: T }).data;
}
