// A minimal stand-in for `express.Router()`. Supports path params
// (`:id`), and a chain of middlewares before the final handler — each
// middleware can either return a `Response` (short-circuits, e.g. a 401 or
// a validation error) or `null` (continue to the next one).
//
// Route paths here are written exactly like the old Express mount paths
// (e.g. "/auth/login", matching `app.use("/api/auth", ...)` + `router.post
// ("/login", ...)` combined) — index.ts strips the "/api" prefix
// (Supabase's gateway already strips "/functions/v1" before this code
// ever runs) before matching, so nothing else has to know that exists.
export interface RouteContext {
  params: Record<string, string>;
  // deno-lint-ignore no-explicit-any
  [key: string]: any; // middlewares attach arbitrary data here (user, body, ...)
}

export type Handler = (req: Request, ctx: RouteContext) => Promise<Response>;
export type Middleware = (req: Request, ctx: RouteContext) => Promise<Response | null>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  middlewares: Middleware[];
  handler: Handler;
}

export default class Router {
  private routes: Route[] = [];

  private add(method: string, path: string, handlers: (Middleware | Handler)[]): void {
    const keys: string[] = [];
    const patternSource = path
      .split("/")
      .map((segment) => {
        if (segment.startsWith(":")) {
          keys.push(segment.slice(1));
          return "([^/]+)";
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");

    const pattern = new RegExp(`^${patternSource}$`);
    const middlewares = handlers.slice(0, -1) as Middleware[];
    const handler = handlers[handlers.length - 1] as Handler;

    this.routes.push({ method, pattern, keys, middlewares, handler });
  }

  get(path: string, ...handlers: (Middleware | Handler)[]): void {
    this.add("GET", path, handlers);
  }

  post(path: string, ...handlers: (Middleware | Handler)[]): void {
    this.add("POST", path, handlers);
  }

  put(path: string, ...handlers: (Middleware | Handler)[]): void {
    this.add("PUT", path, handlers);
  }

  delete(path: string, ...handlers: (Middleware | Handler)[]): void {
    this.add("DELETE", path, handlers);
  }

  // Returns null if no route matched (caller returns 404), otherwise the
  // Response from the matched handler (or from a short-circuiting
  // middleware).
  async handle(req: Request, basePath: string): Promise<Response | null> {
    const url = new URL(req.url);
    let path = url.pathname;

    if (path.startsWith(basePath)) {
      path = path.slice(basePath.length) || "/";
    }
    // Normalize a trailing slash away (except for the root path itself) so
    // "/auth/login/" and "/auth/login" both match.
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    for (const route of this.routes) {
      if (route.method !== req.method) continue;

      const match = path.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1]);
      });

      const ctx: RouteContext = { params };

      for (const middleware of route.middlewares) {
        const shortCircuit = await middleware(req, ctx);
        if (shortCircuit) return shortCircuit;
      }

      return await route.handler(req, ctx);
    }

    return null;
  }
}
