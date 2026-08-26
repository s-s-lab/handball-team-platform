export type CachePolicyRequest = {
  method: string;
  url: string;
};

const SAFE_STATIC_PREFIXES = ["/_next/static/", "/icons/"] as const;
const SAFE_STATIC_PATHS = new Set(["/manifest.webmanifest", "/favicon.ico"]);

export function shouldCacheRequest(
  request: CachePolicyRequest,
  applicationOrigin: string,
): boolean {
  if (request.method.toUpperCase() !== "GET") return false;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  if (url.origin !== applicationOrigin) return false;
  if (SAFE_STATIC_PATHS.has(url.pathname)) return true;
  return SAFE_STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}
