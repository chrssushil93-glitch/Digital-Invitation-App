import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Serves a file uploaded in the admin (the logo). URLs carry ?v=<version>, so it can be cached for a year. */
export async function GET(req: Request, { params }: { params: { name: string } }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!/^[a-z0-9-]{1,40}$/.test(params.name) || !url || !key) return new NextResponse("Not found", { status: 404 });
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.rpc("site_asset", { p_name: params.name });
  const a = data as { mime: string; data: string } | null;
  if (error || !a) return new NextResponse("Not found", { status: 404 });
  const versioned = new URL(req.url).searchParams.has("v");
  return new NextResponse(Buffer.from(a.data, "base64"), {
    headers: {
      "Content-Type": a.mime,
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=300",
      // An uploaded SVG is shown as an image only; never let it run as a page.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
