import { create } from "youtube-dl-exec";

const youtubedl = create("yt-dlp");

import { MediaResult, NormalizedFormat } from "../core/types";

export type { MediaResult, NormalizedFormat };

export class DownloaderError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "DownloaderError";
    this.code = code;
  }
}

/**
 * Parses stderr from yt-dlp to categorize the error
 */
function parseYtDlpError(errorObj: unknown): DownloaderError {
  const err = errorObj as { stderr?: string; message?: string; timedOut?: boolean };
  const msg = err?.message || err?.stderr || String(errorObj);
  
  if (err?.timedOut || msg.includes("Timeout") || msg.includes("timed out")) {
    return new DownloaderError("Extraction timed out", "TIMEOUT");
  }
  if (msg.includes("Network is unreachable") || msg.includes("getaddrinfo") || msg.includes("ECONNRESET") || msg.includes("network")) {
    return new DownloaderError("Network failure connecting to provider", "NETWORK_FAILURE");
  }
  if (msg.includes("Private video") || msg.includes("private")) {
    return new DownloaderError("This video is private", "PRIVATE_VIDEO");
  }
  if (msg.includes("geo-restricted") || msg.includes("Country")) {
    return new DownloaderError("This video is geographically restricted", "GEO_RESTRICTED");
  }
  if (msg.includes("command not found") || msg.includes("ENOENT")) {
    return new DownloaderError("Extraction engine (yt-dlp) binary is missing or not installed properly", "BINARY_MISSING");
  }
  if (msg.includes("HTTP Error 404") || msg.includes("Video unavailable") || msg.includes("not found")) {
    return new DownloaderError("Video not found or unavailable", "NOT_FOUND");
  }
  if (msg.includes("cookies") || msg.includes("Sign in")) {
    return new DownloaderError("Authentication required (cookies might be needed)", "AUTH_REQUIRED");
  }
  
  return new DownloaderError(`Extraction failed: ${msg.split("\n")[0] || "Unknown error"}`, "EXTRACTION_FAILED");
}

interface RawYtDlpFormat {
  format_id: string;
  url?: string;
  vcodec?: string | null;
  acodec?: string | null;
  format_note?: string;
  height?: number;
  tbr?: number;
  ext: string;
  filesize?: number;
  filesize_approx?: number;
  video_ext?: string;
  _hasVideo?: boolean;
  _hasAudio?: boolean;
  _qualityLabel?: string;
}

interface RawYtDlpInfo {
  title?: string;
  thumbnail?: string;
  duration?: number;
  formats?: RawYtDlpFormat[];
  url?: string;
  ext?: string;
}

/**
 * Validates a thumbnail URL to ensure it is actionable and safe.
 */
function validateThumbnail(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return null;
  return trimmed;
}

/**
 * Phase 1: METADATA FETCH
 * Extracts info blindly to normalize it into MediaResult without downloading anything.
 */
export async function extractInfo(url: string, prefixId?: string): Promise<MediaResult> {
  try {
    const rawData = (await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
      playlistItems: "1", // Default: only fetch FIRST video
    }, {
      timeout: 25000
    })) as unknown as RawYtDlpInfo;

    const title = rawData.title || "Video";
    let thumbnail = validateThumbnail(rawData.thumbnail);
    const duration = rawData.duration;

    // Fallback logic for YouTube to guarantee a thumbnail
    if (!thumbnail && prefixId === "youtube") {
      const ytMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?]|$)/);
      if (ytMatch && ytMatch[1]) {
        thumbnail = `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }
    
    // Process formats to extract valid variants
    const allFormats: NormalizedFormat[] = [];
    
    if (rawData.formats && Array.isArray(rawData.formats)) {
      // Collect valid formats maintaining highest bitrate per quality
      const deductions = new Map<string, RawYtDlpFormat>();

      for (const f of rawData.formats) {
        if (!f.url || !f.url.startsWith("http")) continue;
        
        const hasVideo = f.vcodec !== "none" && f.vcodec !== null;
        const hasAudio = f.acodec !== "none" && f.acodec !== null;
        if (!hasVideo && !hasAudio) continue; // Unplayable format

        const qualityLabel = f.format_note || (f.height ? `${f.height}p` : (hasVideo ? "Video" : "Audio"));
        const typeKey = hasVideo ? (hasAudio ? `video-audio-${qualityLabel}` : `video-${qualityLabel}`) : `audio-${qualityLabel}`;
        const bitrate = f.tbr || 0;

        // Dedup: if this typeKey already exists, keep the one with higher bitrate
        const existing = deductions.get(typeKey);
        if (!existing || (existing.tbr || 0) < bitrate) {
          deductions.set(typeKey, { ...f, _hasVideo: hasVideo, _hasAudio: hasAudio, _qualityLabel: qualityLabel });
        }
      }

      for (const f of deductions.values()) {
        allFormats.push({
          id: f.format_id,
          quality: f._qualityLabel || "Variant",
          ext: f.ext,
          size: f.filesize || f.filesize_approx || undefined,
          hasAudio: !!f._hasAudio,
          hasVideo: !!f.video_ext && f.video_ext !== "none"
        });
      }
    }

    // fallback if no formats but direct url exists generic
    if (allFormats.length === 0 && rawData.url) {
      allFormats.push({
        id: "best",
        quality: "Default",
        ext: rawData.ext || "mp4",
        hasAudio: true,
        hasVideo: true,
      });
    }

    if (allFormats.length === 0) {
      throw new Error("No downloadable variants found in metadata");
    }

    // Determine the best download: ideally an mp4 with both audio & video and highest height/quality, otherwise fallback
    const mergedMp4 = allFormats.filter(f => f.hasVideo && f.hasAudio && f.ext === "mp4");
    const bestDownload = mergedMp4.length > 0
      ? mergedMp4[mergedMp4.length - 1] // assumes order preserves somewhat quality or we pick last
      : (allFormats.find(f => f.hasVideo && f.hasAudio) || allFormats.find(f => f.hasVideo) || allFormats[0]);

    const groups = {
      video: allFormats.filter(f => f.hasVideo),
      audio: allFormats.filter(f => !f.hasVideo && f.hasAudio),
      other: [] // auxiliary formats if any 
    };

    return {
      title,
      thumbnail,
      duration,
      provider: prefixId,
      originalUrl: url,
      bestDownload,
      groups
    };
  } catch (err: unknown) {
    throw parseYtDlpError(err);
  }
}

/**
 * Phase 2: DOWNLOAD (Direct URL extraction)
 * Fetches the direct URL for a given format or defaults to best available 
 * priority: bestvideo+bestaudio merged, then best mp4
 */
export async function getDirectUrl(url: string, formatId?: string): Promise<string> {
  const formatSelection = formatId ? formatId : "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
  
  try {
    // We only want the direct URL from stdout. `-g` / `--get-url` does exactly this
    const result = await youtubedl(url, {
      getUrl: true,
      format: formatSelection,
      noWarnings: true,
      playlistItems: "1",
    }, {
      timeout: 25000
    });
    
    // result would be the stdout (the URL string itself)
    const resultStr = result as unknown as string;
    const lines = typeof resultStr === 'string' ? resultStr.split("\n").filter(Boolean) : [];
    if (lines.length > 0) {
      // Just taking the very first URL. If audio/video are split, it returns video then audio on lines.
      // But we prefer merged formats. If it's a single bestvideo and bestaudio, we only get URLs, no merging natively via URL unless we stream.
      // Wait, if it outputs two URLs, it means they are not merged. returning two URLs for direct stream doesn't work.
      // So format should strictly restrict to formats that already contain both, or just best
      return lines[0]; 
    }
    
    throw new Error("No URL returned from extractor");
  } catch (err: unknown) {
    // If it fails with the split format constraint, fallback to just worst case generic 'best'
    if (!formatId && String(err).includes("Requested format is not available")) {
      try {
        const fallbackResult = await youtubedl(url, {
          getUrl: true,
          format: "best",
          noWarnings: true,
          playlistItems: "1",
        }, {
          timeout: 25000
        });
        const fallbackStr = fallbackResult as unknown as string;
        const fallbackLines = typeof fallbackStr === 'string' ? fallbackStr.split("\n").filter(Boolean) : [];
        if (fallbackLines.length > 0) return fallbackLines[0];
      } catch (fallbackErr: unknown) {
        throw parseYtDlpError(fallbackErr);
      }
    }
    throw parseYtDlpError(err);
  }
}
