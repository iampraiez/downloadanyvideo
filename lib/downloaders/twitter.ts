import { DownloadResult } from "../downloaders";

export async function downloadTwitter(
  url: string,
  _provider: string
): Promise<DownloadResult> {
  try {
    const match = url.match(/(?:x\.com|twitter\.com|t\.co)\/(?:[a-zA-Z0-9_]+)\/status\/([0-9]+)/);
    let tweetId = match ? match[1] : null;

    if (!tweetId) {
      const idMatch = url.match(/^[0-9]+$/);
      if (idMatch) tweetId = idMatch[0];
    }
    
    if (!tweetId) {
       return { error: "Could not extract tweet ID from the provided URL." };
    }

    const response = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`);
    
    if (!response.ok) {
       return { error: "Failed to fetch from Twitter CDN." };
    }

    const data = await response.json();
    
    if (data.mediaURLs && data.mediaURLs.length > 0) {
      const videoUrl = data.mediaURLs.find((u: string) => u.includes(".mp4")) || data.mediaURLs[0];
      return {
        downloadUrl: videoUrl,
        title: data.text ? data.text.substring(0, 100) : "Twitter Video",
        thumbnail: data.media_extended?.[0]?.thumbnail_url || null,
        format: "mp4",
      };
    }
    
    return { error: "No video found in this Tweet." };
  } catch (err) {
    console.error("[Twitter Downloader] Error:", err);
    return { error: "Failed to download from Twitter." };
  }
}
