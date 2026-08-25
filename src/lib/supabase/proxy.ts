import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthPath, isProtectedPath, safeNextPath } from "@/lib/auth/routes";
import { getPublicEnv } from "@/lib/env";

function redirectWithSession(url: URL, source: NextResponse) {
  const response = NextResponse.redirect(url);

  source.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });

  source.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey !== "location" && normalizedKey !== "set-cookie") {
      response.headers.set(key, value);
    }
  });

  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(cacheHeaders).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims;
  const pathname = request.nextUrl.pathname;

  if (!claims && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", safeNextPath(`${pathname}${request.nextUrl.search}`));
    return redirectWithSession(loginUrl, supabaseResponse);
  }

  if (claims && (pathname === "/login" || pathname === "/signup")) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/app";
    appUrl.search = "";
    return redirectWithSession(appUrl, supabaseResponse);
  }

  if (isAuthPath(pathname) || isProtectedPath(pathname)) {
    supabaseResponse.headers.set("Cache-Control", "private, no-store");
  }

  return supabaseResponse;
}
