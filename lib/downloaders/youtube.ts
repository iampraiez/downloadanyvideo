import { DownloadResult } from "../downloaders";
import { Innertube, UniversalCache } from "youtubei.js";

export async function downloadYouTube(
  url: string,
  _noWatermark: boolean = false,
): Promise<DownloadResult> {
  try {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|.*shorts\/|.*vi?\/))([^"&?\s]{11})/);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      return { error: "Invalid YouTube URL." };
    }
    
    const yt = await Innertube.create({ cache: new UniversalCache(false) });
    const info = await yt.getBasicInfo(videoId, { client: "ANDROID" });
    
    const format = info.chooseFormat({ type: "video+audio", quality: "best" });
    if (!format || !format.url) throw new Error("Format unavailable");

    return {
      downloadUrl: format.url,
      title: info.basic_info.title || "YouTube Video",
      thumbnail: info.basic_info.thumbnail?.[0]?.url || null,
      format: "mp4",
    };
  } catch (err) {
    console.error("[YouTube Downloader] Error:", err);
    return { error: "Failed to process YouTube execution. Format blocked or Vercel IP rate-limited." };
  }
}
