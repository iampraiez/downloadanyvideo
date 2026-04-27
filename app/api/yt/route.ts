import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !ytdl.validateURL(url)) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[/\\?%*:|"<>]/g, "");

    let format;
    try {
      format = ytdl.chooseFormat(info.formats, {
        quality: "highest",
        filter: "audioandvideo",
      });
    } catch {
      format = ytdl.chooseFormat(info.formats, { quality: "highest" });
    }

    const nodeStream = ytdl(url, { format });

    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: any) =>
          controller.enqueue(new Uint8Array(chunk)),
        );
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err: any) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(title)}.mp4"`,
    );
    headers.set("Content-Type", "video/mp4");

    return new NextResponse(webStream, { headers });
  } catch (err) {
    console.error("YouTube Stream Error:", err);
    return NextResponse.json(
      { error: "Failed to stream YouTube video" },
      { status: 500 },
    );
  }
}
