// Same JSON envelope as the old utils/response.js — { success, message,
// data } — so the frontend needs zero changes on this front. The Express
// version wrote onto `res` directly; here we build and return a `Response`
// object instead. `extraHeaders` is how a controller attaches Set-Cookie
// headers (see cookies.ts) without this helper needing to know about auth.
export function successResponse(
  data: unknown = null,
  message = "Success",
  status = 200,
  extraHeaders?: Headers
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify({ success: true, message, data }), {
    status,
    headers,
  });
}

export function errorResponse(
  message = "Internal Server Error",
  status = 500,
  extraHeaders?: Headers
): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers,
  });
}
