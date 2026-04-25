import { NextRequest } from "next/server";

export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const filename = searchParams.get("filename") ?? "video.mp4";

  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const range = request.headers.get("range");

    const fetchHeaders: Record<string, string> = {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      "accept": "*/*",
      "referer": "https://twitter.com/",
    };

    if (range) {
      fetchHeaders["range"] = range;
    }

    const upstreamResponse = await fetch(url, {
      method: "GET",
      headers: fetchHeaders,
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return new Response(`Failed to fetch upstream URL: ${upstreamResponse.statusText}`, {
        status: 502,
      });
    }

    const responseHeaders = new Headers({
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
    });

    const contentType = upstreamResponse.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);

    const contentLength = upstreamResponse.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = upstreamResponse.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`Proxy error: ${message}`, { status: 502 });
  }
}
