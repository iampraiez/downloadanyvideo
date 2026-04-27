import { DownloadResult } from "../downloaders";

export async function downloadTikTok(
  url: string,
  _provider: string,
  _noWatermark: boolean
): Promise<DownloadResult> {
  try {
    const response = await fetch(`https://www.tikwm.com/api/?url=${url}?hd=1`);
    if (!response.ok) return { error: "TikTok extraction failed via public api." };

    const json = await response.json();
    if (json.code === 0 && json.data) {
      const bestUrl = _noWatermark ? json.data.play : (json.data.wmplay || json.data.play);
      return {
        downloadUrl: bestUrl,
        title: json.data.title || "TikTok Video",
        thumbnail: json.data.cover || null,
        format: "mp4"
      };
    }
    
    return { error: json.msg || "Failed to extract TikTok video." };
  } catch (err) {
    console.error("[TikTok Downloader] Error:", err);
    return { error: "Failed to process TikTok execution." };
  }
}

