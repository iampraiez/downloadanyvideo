import { DownloadResult } from "../downloaders";
const igUrlDirect = require("instagram-url-direct");

export async function downloadInstagram(
  url: string,
  _noWatermark: boolean = false,
): Promise<DownloadResult> {
  try {
    const data = await igUrlDirect.instagramGetUrl(url);

    if (data.url_list && data.url_list.length > 0) {
      return {
        downloadUrl: data.url_list[0],
        title: "Instagram Post",
        thumbnail: null,
        format: "mp4",
      };
    }

    return { error: "Extraction completed but no Instagram video URL was returned. It may be private or login-walled." };
  } catch (err) {
    console.error("[Instagram Downloader] Error:", err);
    return { error: "Failed to process Instagram execution. Link might be invalid or login-walled." };
  }
}
