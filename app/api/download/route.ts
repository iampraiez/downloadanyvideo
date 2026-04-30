import { NextResponse } from "next/server";
import { getDownloadUrl } from "@/lib/core/resolver";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const formatId = searchParams.get("formatId");
  
  const rawTitle = searchParams.get("title") || "video";
  const ext = searchParams.get("ext") || "mp4";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const directUrl = await getDownloadUrl(url, formatId || undefined);
    
    const safeTitle = rawTitle.replace(/[^\w\s-]/g, "").slice(0, 80);
    const filename = `${safeTitle || "video"}.${ext}`;

    const upstream = await fetch(directUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0",
        "Referer": "https://x.com/"
      },
    });

    if (!upstream.ok) {
      throw new Error(`Upstream returned ${upstream.status}`);
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new Response(upstream.body, { 
      status: 200,
      headers 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process download stream";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
