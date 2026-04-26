import { NextRequest, NextResponse } from "next/server";
import { sanitizeUrl } from "@/lib/sanitize";
import { PROVIDERS } from "@/lib/providers";
import { logRequest, logFailure, logSuccess, progressBar } from "@/lib/logger";
import { download, type DownloadResult } from "@/lib/downloaders";

export const maxDuration = 60;

interface RequestBody {
  url: string;
  provider: string;
  noWatermark: boolean;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body – expected JSON." },
      { status: 400 }
    );
  }

  const { url, provider, noWatermark: _noWatermark } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing or invalid `url`." }, { status: 400 });
  }

  const sanitized = sanitizeUrl(url);
  if (!sanitized) {
    return NextResponse.json(
      { error: "The provided URL is invalid or potentially unsafe." },
      { status: 400 }
    );
  }

  if (!provider || typeof provider !== "string") {
    return NextResponse.json({ error: "Missing `provider`." }, { status: 400 });
  }

  const providerId = provider.toLowerCase();

  const knownProvider = PROVIDERS.find((p) => p.id === providerId);
  if (!knownProvider) {
    return NextResponse.json(
      {
        error: `Unknown provider: "${provider}". Supported providers are: ${PROVIDERS.map((p) => p.id).join(", ")}.`,
      },
      { status: 400 }
    );
  }

  logRequest(knownProvider.name, sanitized, false);
  progressBar(knownProvider.name, 1, 3);

  const startMs = Date.now();

  try {
    progressBar(knownProvider.name, 2, 3);
    const result: DownloadResult = await download(sanitized, providerId);
    const durationMs = Date.now() - startMs;

    if ("error" in result) {
      logFailure(knownProvider.name, result.error, durationMs);
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    progressBar(knownProvider.name, 3, 3);
    
    if (result.downloadUrl) {
      logSuccess(knownProvider.name, result.downloadUrl, durationMs);
      return NextResponse.json({
        downloadUrl: result.downloadUrl,
        title: result.title,
        thumbnail: result.thumbnail,
        format: result.format,
      });
    }

    if (result.downloadId) {
      console.log("Saved file:", `/tmp/${result.downloadId}.mp4`);
      logSuccess(knownProvider.name, result.downloadId, durationMs);
      return NextResponse.json({
        downloadId: result.downloadId,
      });
    }

    return NextResponse.json({ error: "No download location retrieved" }, { status: 422 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startMs;
    logFailure(knownProvider.name, message, durationMs);
    return NextResponse.json(
      { error: `An unexpected server error occurred: ${message}` },
      { status: 500 }
    );
  }
}
