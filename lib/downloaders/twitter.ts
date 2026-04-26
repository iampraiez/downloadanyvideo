import { DownloadResult } from "../downloaders";
import { create } from "youtube-dl-exec";
import crypto from "crypto";
import fs from "fs";

interface BtchTwitterUrl {
  hd?: string;
  sd?: string;
}

interface BtchTwitterResult {
  status?: boolean;
  title?: string;
  url?: BtchTwitterUrl[];
}

interface BtchDownloaderExport {
  twitterdown?: (url: string) => Promise<BtchTwitterResult>;
  twitter?: (url: string) => Promise<BtchTwitterResult>;
}

function getBestTwitterUrl(urls: BtchTwitterUrl[]): string | null {
  const candidates: { url: string; score: number }[] = [];

  for (const u of urls) {
    const value = u.hd || u.sd;
    if (!value) continue;

    const match = value.match(/\/(\d+)x(\d+)\//);
    let score = 0;

    if (match) {
      const width = parseInt(match[1], 10);
      const height = parseInt(match[2], 10);
      score = width * height;
    }

    candidates.push({ url: value, score });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

async function twitterYtDlpFallback(url: string): Promise<DownloadResult> {
  const binaryPath = process.env.YT_DLP_PATH ?? "yt-dlp";
  const youtubeDlExec = create(binaryPath);
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
    return { error: "Twitter video could not be downloaded." };
  }

  setTimeout(() => fs.unlink(tempPath, () => {}), 10 * 60 * 1000);
  return { downloadId };
}

export async function downloadTwitter(
  url: string,
  _provider: string
): Promise<DownloadResult> {
  try {
    console.log("[Twitter] Using btch-downloader");
    const btch = (await import("btch-downloader")) as unknown as BtchDownloaderExport;
    const twitterDownloader = btch.twitterdown || btch.twitter;

    if (twitterDownloader) {
      const data = await twitterDownloader(url);

      if (data?.status === false) {
        console.log("[Twitter] btch-downloader returned status:false, falling back to yt-dlp");
        return await twitterYtDlpFallback(url);
      }

      if (data && data.url && Array.isArray(data.url) && data.url.length > 0) {
        console.log("[Twitter] Variants:", data.url);
        const selectedUrl = getBestTwitterUrl(data.url);

        if (!selectedUrl) {
          console.log("[Twitter] No usable URL found, falling back to yt-dlp");
          return await twitterYtDlpFallback(url);
        }

        console.log("[Twitter] Selected:", selectedUrl);
        return {
          downloadUrl: selectedUrl,
          title: data.title ?? "",
          thumbnail: null,
          format: "mp4",
        };
      }

      console.log("[Twitter] No URL array in response, falling back to yt-dlp");
      return await twitterYtDlpFallback(url);
    }
  } catch (_err) {
    console.log("[Twitter] btch-downloader threw, falling back to yt-dlp:", _err);
    try {
      return await twitterYtDlpFallback(url);
    } catch (_e) {
      return { error: "Twitter video could not be downloaded." };
    }
  }

  return { error: "Twitter video could not be resolved." };
}
