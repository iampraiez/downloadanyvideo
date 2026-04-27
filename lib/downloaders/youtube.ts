import { DownloadResult } from "../downloaders";
import ytdl from "@distube/ytdl-core";

export async function downloadYouTube(
  url: string,
  _noWatermark: boolean = false,
): Promise<DownloadResult> {
  try {
    if (!ytdl.validateURL(url)) {
      return { error: "Invalid YouTube URL." };
    }
    
    const info = await ytdl.getInfo(url);
    
    return {
      // By returning an internal route, the frontend bypasses standard proxy and CDN failures
      downloadUrl: `/api/yt?url=${encodeURIComponent(url)}`,
      title: info.videoDetails.title || "YouTube Video",
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || null,
      format: "mp4",
    };
  } catch (err) {
    console.error("[YouTube Downloader] Error:", err);
    return { error: "Failed to process YouTube execution. Format blocked or Vercel IP rate-limited." };
  }
}
