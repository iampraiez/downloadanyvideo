import { DownloadResult } from "../downloaders";
import youtubeDlExec from "youtube-dl-exec";
import crypto from "crypto";
import fs from "fs";

interface BtchTikTokResult {
  title?: string;
  thumbnail?: string;
  video?: {
    no_watermark?: string;
    noWatermark?: string;
    hd?: string;
    sd?: string;
    watermark?: string;
    wm?: string;
  } | Array<unknown>;
}

interface BtchDownloaderExport {
  tiktok?: (url: string) => Promise<BtchTikTokResult>;
  ttdown?: (url: string) => Promise<BtchTikTokResult>;
  ttdl?: (url: string) => Promise<BtchTikTokResult>;
}

async function tiktokYtDlpFallback(url: string): Promise<DownloadResult> {
  console.log("[TikTok] Falling back to yt-dlp due to btch failure");
  const downloadId = crypto.randomUUID();
  const tempPath = `/tmp/${downloadId}.mp4`;

  await youtubeDlExec(url, {
    noCheckCertificates: true,
    format: "bestvideo+bestaudio/best",
    mergeOutputFormat: "mp4",
    output: tempPath,
    noWarnings: true,
  } as Record<string, unknown>);

  if (!fs.existsSync(tempPath)) {
    return { error: "TikTok video could not be downloaded." };
  }

  setTimeout(() => fs.unlink(tempPath, () => {}), 10 * 60 * 1000);
  return { downloadId };
}

export async function downloadTikTok(
  url: string,
  _provider: string,
  _noWatermark: boolean
): Promise<DownloadResult> {
  try {
    console.log("[TikTok] Using btch-downloader");
    const btch = (await import("btch-downloader")) as unknown as BtchDownloaderExport;
    const tiktokDownloader = btch.ttdl || btch.tiktok || btch.ttdown;

    if (tiktokDownloader) {
      const data = (await tiktokDownloader(url)) as BtchTikTokResult;
      
      // If video is empty array or missing cleanly failover.
      if (!data.video || Array.isArray(data.video)) {
         return await tiktokYtDlpFallback(url);
      }
      
      let selectedUrl: string | null = null;

      if (_noWatermark) {
        selectedUrl =
          data.video?.no_watermark ||
          data.video?.noWatermark ||
          data.video?.watermark ||
          data.video?.wm ||
          data.video?.hd ||
          data.video?.sd ||
          null;
      } else {
        selectedUrl =
          data.video?.watermark ||
          data.video?.wm ||
          data.video?.no_watermark ||
          data.video?.noWatermark ||
          data.video?.hd ||
          data.video?.sd ||
          null;
      }
      
      if (!selectedUrl) {
         return await tiktokYtDlpFallback(url);
      }

      console.log("[TikTok] Selected URL:", selectedUrl);
      return {
        downloadUrl: selectedUrl,
        title: data.title ?? "",
        thumbnail: data.thumbnail ?? null,
        format: "mp4",
      };
    }
  } catch (_err) {
    console.error("[TikTok] Downloader internal fetch error:", _err);
  }
  
  try {
    return await tiktokYtDlpFallback(url);
  } catch (_e) {
    return { error: "TikTok extraction failed completely across all strategies" };
  }
}
