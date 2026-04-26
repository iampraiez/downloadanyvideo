import { create } from "youtube-dl-exec";
import crypto from "crypto";
import fs from "fs";
import { DownloadResult } from "../downloaders";

function getYtDlp() {
  const binaryPath = process.env.YT_DLP_PATH ?? "yt-dlp";
  return create(binaryPath);
}

export async function downloadYouTube(
  url: string,
  _noWatermark: boolean = false,
): Promise<DownloadResult> {
  const downloadId = crypto.randomUUID();
  const tempPath = `/tmp/${downloadId}.mp4`;

  const options: Record<string, unknown> = {
    noCheckCertificates: true,
    preferFreeFormats: true,
    format: "bestvideo+bestaudio/best",
    mergeOutputFormat: "mp4",
    output: tempPath,
    noWarnings: true,
    playlistItems: "1",
    noPlaylist: true,
  };

  if (process.env.YT_DLP_USE_BROWSER_COOKIES === "true") {
    options.cookiesFromBrowser = "chrome";
  }

  try {
    const youtubeDlExec = getYtDlp();
    await youtubeDlExec(url, options);

    if (!fs.existsSync(tempPath)) {
      return { error: "Download failed: yt-dlp did not produce a file. FFmpeg may be required." };
    }

    console.log("Saved file:", tempPath);

    setTimeout(() => {
      fs.unlink(tempPath, () => {});
    }, 10 * 60 * 1000);

    return { downloadId };
  } catch (_err: unknown) {
    return { error: "YouTube video could not be downloaded." };
  }
}
