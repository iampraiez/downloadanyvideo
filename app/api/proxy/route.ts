import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") || "video.mp4";

  if (!url) return NextResponse.json({ error: "Missing link" }, { status: 400 });

  try {
    const userAgent = req.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";
    let referer = "https://google.com/";
    if (url.includes("twimg.com")) referer = "https://twitter.com/";
    if (url.includes("googlevideo.com")) referer = "https://www.youtube.com/";
    if (url.includes("tiktokcdn")) referer = "https://www.tiktok.com/";

    const response = await fetch(url, { 
      redirect: "follow",
      headers: {
        "User-Agent": userAgent,
        "Referer": referer,
        "Accept": "*/*"
      }
    });

    if (!response.ok) {
      console.error(`Proxy stream failed: ${response.status} ${response.statusText} for URL: ${url.slice(0, 50)}...`);
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const headers = new Headers(response.headers);
    // Explicitly force download instead of inline view
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.delete("content-encoding"); 
    
    return new NextResponse(response.body, { headers });
  } catch (_err) {
    // If the proxy fails for any reason, redirect gracefully to the native url
    return NextResponse.redirect(url); 
  }
}
