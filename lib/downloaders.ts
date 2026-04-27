import { downloadYouTube } from "./downloaders/youtube";
import { downloadTwitter } from "./downloaders/twitter";
import { downloadTikTok } from "./downloaders/tiktok";
import { downloadInstagram } from "./downloaders/instagram";

export interface DownloadSuccess {
  downloadId?: string;
  downloadUrl?: string;
  title?: string;
  thumbnail?: string | null;
  format?: string | null;
}

export interface DownloadError {
  error: string;
}

export type DownloadResult = DownloadSuccess | DownloadError;

const SUPPORTED_PROVIDERS = new Set([
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
]);



export async function download(
  url: string,
  provider: string,
  _noWatermark: boolean = false,
): Promise<DownloadResult> {
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return {
      error: `Provider "${provider}" is not supported. Supported providers: ${[...SUPPORTED_PROVIDERS].join(", ")}.`,
    };
  }

  try {
    if (provider === "youtube") {
      return await downloadYouTube(url, _noWatermark);
    }
    if (provider === "twitter") {
      return await downloadTwitter(url, provider);
    }

    if (provider === "tiktok") {
      return await downloadTikTok(url, provider, _noWatermark);
    }

    if (provider === "instagram") {
      return await downloadInstagram(url, _noWatermark);
    }

    return { error: "Video is private or unavailable." };
  } catch (err: unknown) {
    console.error("Downloader global error:", err);
    return { error: "Failed to extract media from provider" };
  }
}
