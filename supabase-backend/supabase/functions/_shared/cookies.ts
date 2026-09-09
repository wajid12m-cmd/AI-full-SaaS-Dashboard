// Express's `cookie-parser` + `res.cookie()` don't exist here — cookies are
// just header strings we build and parse by hand. Behavior matches the
// original utils/cookies.js as closely as possible:
//   - httpOnly, so an XSS bug can't read the token via JavaScript
//   - secure + SameSite=None in production (required for the cross-site
//     Vercel <-> Supabase setup); relaxed to SameSite=Lax for local dev
//
// One deliberate simplification vs. the original: the refresh cookie is no
// longer scoped to `Path=/api/auth` only. Under Express that path was
// relative to the app's own routes. Here, the function is actually served
// at `https://<project>.supabase.co/functions/v1/api/...`, so scoping to
// "/api/auth" would silently break (the browser would never send the
// cookie back, since the real path starts with "/functions/v1/...").
// Rather than hard-code Supabase's URL structure into this file, both
// cookies use `Path=/`, meaning the refresh cookie is now sent on every
// request instead of only /auth/refresh. It's still httpOnly and still
// short-of-value to anything except that one endpoint's logic, so this is
// a minor request-size cost, not a new security hole.
const isProd = Deno.env.get("NODE_ENV") === "production";

export const ACCESS_COOKIE_NAME = "accessToken";
export const REFRESH_COOKIE_NAME = "refreshToken";

const ACCESS_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly"];

  if (isProd) {
    parts.push("Secure", "SameSite=None");
  } else {
    parts.push("SameSite=Lax");
  }

  parts.push(`Max-Age=${maxAgeSeconds}`);

  return parts.join("; ");
}

export function setAccessCookie(headers: Headers, accessToken: string): void {
  headers.append("Set-Cookie", buildCookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_MAX_AGE_SECONDS));
}

export function setAuthCookies(
  headers: Headers,
  { accessToken, refreshToken }: { accessToken: string; refreshToken: string }
): void {
  setAccessCookie(headers, accessToken);
  headers.append("Set-Cookie", buildCookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_MAX_AGE_SECONDS));
}

export function clearAuthCookies(headers: Headers): void {
  headers.append("Set-Cookie", buildCookie(ACCESS_COOKIE_NAME, "", 0));
  headers.append("Set-Cookie", buildCookie(REFRESH_COOKIE_NAME, "", 0));
}

// Deno's Request has no `.cookies` — parse the raw `Cookie` header by hand.
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get("cookie") || "";
  const out: Record<string, string> = {};

  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });

  return out;
}
