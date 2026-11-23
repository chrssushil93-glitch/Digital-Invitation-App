import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the host's Supabase session fresh on studio and auth routes.
export async function middleware(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const p = request.nextUrl.pathname;
  if (!p.startsWith("/auth/") && (q.has("code") || (q.has("token_hash") && q.has("type")))) {
    const to = request.nextUrl.clone();
    to.pathname = "/auth/callback";
    return NextResponse.redirect(to);
  }
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const next = request.cookies.get("nm_next")?.value;
  if (user && next === "/studio/new" && p === "/studio") {
    const to = request.nextUrl.clone();
    to.pathname = "/studio/new";
    to.search = "";
    const r = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    r.cookies.delete("nm_next");
    return r;
  }
  return response;
}

export const config = { matcher: ["/", "/studio/:path*", "/login", "/auth/:path*"] };
