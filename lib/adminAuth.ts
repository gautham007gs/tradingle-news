// Server-only module — verifies admin/editor sessions against the PHP backend.
import { getServerApiBase } from "./site";

export type AdminAuthResult = {
  ok: true;
  user: { id: string; roles: string[] };
} | {
  ok: false;
  status: number;
  message: string;
};

/**
 * Verifies the session for the PHP backend's /auth/me.php endpoint, and
 * requires the resolved user to have one of `roles` (defaults to admin/editor).
 *
 * The credential is resolved from two places, mirroring the rest of the CMS:
 *   1. A Bearer token from the Authorization header (module-memory token the
 *      frontend holds during a page session), or
 *   2. The HttpOnly `tradingle_session` cookie set by the PHP API (sent
 *      automatically on same-origin fetches).
 *
 * auth/me.php returns `user.roles` as an array (never a singular `role`), so
 * membership is checked against that array — the legacy singular `role` read
 * always resolved to "" and rejected legitimate admins/editors.
 */
export async function verifyAdminSession(
  req: Request,
  opts?: { roles?: string[] }
): Promise<AdminAuthResult> {
  const allowedRoles = opts?.roles ?? ["admin", "editor"];
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();

  const cookieToken =
    req.headers.get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("tradingle_session="))
      ?.split("=").slice(1).join("=")
      .trim() ?? "";

  const token = bearer || cookieToken;
  if (!token) return { ok: false, status: 401, message: "Unauthorized" };

  const apiBase = getServerApiBase();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${apiBase}/auth/me.php`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(process.env.API_SECRET_KEY ? { "X-API-Key": process.env.API_SECRET_KEY } : {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { ok: false, status: 401, message: "Unauthorized" };
    const data = await res.json();
    if (!data?.user?.id) return { ok: false, status: 401, message: "Unauthorized" };

    const roles: string[] = Array.isArray(data.user.roles)
      ? data.user.roles.map(String)
      : [];
    if (!allowedRoles.some((r) => roles.includes(r))) {
      return { ok: false, status: 403, message: "Forbidden — admin or editor required" };
    }
    return { ok: true, user: { id: String(data.user.id), roles } };
  } catch {
    return { ok: false, status: 401, message: "Unauthorized — could not verify session" };
  }
}
