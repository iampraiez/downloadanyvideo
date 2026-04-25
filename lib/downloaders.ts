import { create } from "youtube-dl-exec";

const ytDlpPath = "node_modules/youtube-dl-exec/bin/yt-dlp";

const youtubeDlExec = create(ytDlpPath);

export interface DownloadSuccess {
  downloadUrl: string;
  title: string;
  thumbnail: string | null;
  format: string | null;
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

interface YtDlpOutput {
  title?: string;
  thumbnail?: string;
  url?: string;
  formats?: Array<{
    url?: string;
    ext?: string;
    vcodec?: string;
    acodec?: string;
    format_note?: string;
    tbr?: number;
  }>;
  ext?: string;
  format?: string;
  format_note?: string;
}

interface BtchTwitterUrl {
  hd?: string;
  sd?: string;
}

interface BtchTwitterResult {
  title?: string;
  url?: BtchTwitterUrl[];
}

interface YtDlpOptions {
  dumpSingleJson: boolean;
  noCheckCertificates: boolean;
  preferFreeFormats: boolean;
  format: string;
  cookiesFromBrowser?: string;
}

function pickBestUrl(output: YtDlpOutput): string | null {
  if (output.url) return output.url;

  if (!output.formats?.length) return null;

  const validFormats = output.formats.filter((f) => f.url);

  if (validFormats.length === 0) return null;

  const sorted = validFormats.sort((a, b) => (b.tbr ?? 0) - (a.tbr ?? 0));

  return sorted[0].url ?? null;
}

interface BtchDownloaderExport {
  twitterdown?: (url: string) => Promise<BtchTwitterResult>;
  twitter?: (url: string) => Promise<BtchTwitterResult>;
}

export async function download(
  url: string,
  provider: string,
): Promise<DownloadResult> {
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return {
      error: `Provider "${provider}" is not supported. Supported providers: ${[...SUPPORTED_PROVIDERS].join(", ")}.`,
    };
  }

  try {
    const options: YtDlpOptions = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      format: "bv*+ba/b",
    };

    if (process.env.YT_DLP_USE_BROWSER_COOKIES === "true") {
      options.cookiesFromBrowser = "chrome";
    }

    const output = (await youtubeDlExec(url, options)) as YtDlpOutput;

    const downloadUrl = pickBestUrl(output);

    if (!downloadUrl) {
      return { error: "yt-dlp returned no usable download URL" };
    }

    return {
      downloadUrl,
      title: output.title ?? "",
      thumbnail: output.thumbnail ?? null,
      format: output.format_note ?? output.format ?? output.ext ?? null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    console.error("yt-dlp raw error:", err);

    if (provider === "twitter") {
      try {
        const btch = (await import(
          "btch-downloader"
        )) as unknown as BtchDownloaderExport;
        const twitterDownloader = btch.twitterdown || btch.twitter;

        if (twitterDownloader) {
          const data = await twitterDownloader(url);

          if (data && data.url && Array.isArray(data.url)) {
            const best =
              data.url.find((u: BtchTwitterUrl) => u.hd)?.hd ??
              data.url.find((u: BtchTwitterUrl) => u.sd)?.sd ??
              null;

            if (best) {
              return {
                downloadUrl: best,
                title: data.title ?? "",
                thumbnail: null,
                format: best.includes("hd") ? "hd" : "sd",
              };
            }
          }
        }
      } catch (fbErr) {
        console.error("btch Twitter fallback failed:", fbErr);
      }
    }

    const lowerMessage = message.toLowerCase();

    if (
      provider === "twitter" &&
      (lowerMessage.includes("login required") ||
        lowerMessage.includes("private") ||
        lowerMessage.includes("unavailable"))
    ) {
      return {
        error:
          "This Twitter video requires authentication or is not publicly accessible",
      };
    }

    return {
      error:
        "We couldn't process this video. It might be private, unavailable, or temporarily blocked by the provider.",
    };
  }
}
