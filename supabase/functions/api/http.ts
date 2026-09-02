/** Demo-ready CORS allowlist (backend-build-plan launch security bar). */
const CORS_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://stravyx.com",
  "https://www.stravyx.com",
  "https://app.stravyx.com",
  "https://prototype-project-app-web.vercel.app",
  "https://prototype-project-app-web-stravyx.vercel.app",
]);

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (CORS_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    // Custom domains + Vercel production/preview aliases for this project
    return (
      hostname === "app.stravyx.com" ||
      hostname === "stravyx.com" ||
      hostname.endsWith(".stravyx.com") ||
      hostname === "prototype-project-app-web.vercel.app" ||
      (hostname.startsWith("prototype-project-app") &&
        hostname.endsWith("-stravyx.vercel.app"))
    );
  } catch {
    return false;
  }
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin = isAllowedOrigin(origin) && origin
    ? origin
    : "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

export function json(
  data: unknown,
  status = 200,
  cors: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
