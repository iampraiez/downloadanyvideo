"use client";

import { useState, useCallback, useEffect } from "react";
import {
  PROVIDERS,
  PLAYLIST_PATTERNS,
  WATERMARK_PROVIDER_IDS,
  type Provider,
} from "@/lib/providers";
import { sanitizeUrl, extractUrls } from "@/lib/sanitize";
import Image from "next/image";
import WatermarkSwitch from "@/components/WatermarkSwitch";
import Marquee from "@/components/Marquee";

interface StatusMessage {
  type: "error" | "success" | "info";
  text: string;
}

interface DetectedProvider extends Provider {
  unknown?: false;
}

interface UnknownProvider {
  id: string;
  name: string;
  unknown: true;
}

type CurrentProvider = DetectedProvider | UnknownProvider | null;

function isPlaylist(url: string, providerId: string): boolean {
  const pattern = PLAYLIST_PATTERNS[providerId];
  return pattern ? pattern.test(url) : false;
}

function triggerDownloadLink(downloadUrl: string, filename: string): void {
  // Use server proxy to inject Content-Disposition headers and bypass CORS redirect UX
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}`;
  
  const anchor = document.createElement("a");
  anchor.href = proxyUrl;
  anchor.download = filename;
  anchor.target = "_top";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export default function HomePage(): React.ReactElement {
  const [url, setUrl] = useState<string>("");
  const [currentProvider, setCurrentProvider] = useState<CurrentProvider>(null);
  const [noWatermark, setNoWatermark] = useState<boolean>(false);
  const [linkMeta, setLinkMeta] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(
    null,
  );
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setProgress(15);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          const increment = Math.max(1, (95 - prev) * 0.1);
          return Math.min(95, prev + increment);
        });
      }, 400);
    } else {
      setProgress(100);
      const to = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(to);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const raw = e.target.value;
      setUrl(raw);
      setLinkMeta(null);
      setNoWatermark(false);
      setStatusMessage(null);

      if (!raw.trim()) {
        setCurrentProvider(null);
        return;
      }

      const allUrls = extractUrls(raw);
      if (allUrls.length > 1) {
        setCurrentProvider(null);
        setLinkMeta(
          `${allUrls.length} links detected — only single-video URLs are supported`,
        );
        return;
      }

      const sanitized = sanitizeUrl(raw);

      if (!sanitized) {
        setCurrentProvider({
          id: "unknown",
          name: "Invalid or unsafe URL",
          unknown: true,
        });
        return;
      }

      const detected = PROVIDERS.find((p) => p.regex.test(sanitized));
      if (detected) {
        setCurrentProvider(detected as DetectedProvider);
        if (isPlaylist(sanitized, detected.id)) {
          setLinkMeta(
            "Playlist or channel URL detected · all videos will be queued",
          );
        }
      } else {
        setCurrentProvider({
          id: "unknown",
          name: "Unknown provider",
          unknown: true,
        });
      }
    },
    [],
  );

  useEffect(() => {
    const autoPaste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== url && PROVIDERS.some(p => p.regex.test(text))) {
          setUrl(text);
          // Manually trigger the validation chain
          handleInput({ target: { value: text } } as unknown as React.ChangeEvent<HTMLInputElement>);
        }
      } catch (_err) {
        // Silently ignore if permissions are denied or browser restricts event-less clipboard reads
      }
    };
    
    window.addEventListener("focus", autoPaste);
    autoPaste(); // Fire initially
    return () => window.removeEventListener("focus", autoPaste);
  }, [url, handleInput]);

  const handleDownload = useCallback(async (): Promise<void> => {
    if (!currentProvider || currentProvider.unknown) {
      setStatusMessage({
        type: "error",
        text: "No valid video link detected.",
      });
      return;
    }

    const sanitized = sanitizeUrl(url);
    if (!sanitized) {
      setStatusMessage({
        type: "error",
        text: "Invalid URL.",
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sanitized,
          provider: currentProvider.id,
          noWatermark:
            WATERMARK_PROVIDER_IDS.has(currentProvider.id) && noWatermark,
        }),
      });

      const data = (await res.json()) as {
        downloadId?: string;
        downloadUrl?: string;
        error?: string;
        title?: string;
        format?: string;
      };

      if (!res.ok || data.error) {
        setStatusMessage({
          type: "error",
          text: data.error ?? `Server error ${res.status}`,
        });
        return;
      }

      if (data.downloadUrl) {
        let filename = `${currentProvider.name} Video`;
        if (data.title && data.title.trim() !== "") {
          const safeTitle = data.title
            .replace(/[/\\?%*:|"<>]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
          filename = `[${currentProvider.name}] ${safeTitle}`.trim();
        }

        const ext = data.format?.includes("mp4")
          ? "mp4"
          : (data.downloadUrl.split("?")[0].split(".").pop() ?? "mp4");
        filename = `${filename}.${ext}`;

        triggerDownloadLink(data.downloadUrl, filename);
        setStatusMessage({
          type: "success",
          text: "Download started!",
        });
        setUrl("");
        setCurrentProvider(null);
      } else if (data.downloadId) {
        const finalFilename = `${data.downloadId}.mp4`;
        const fileUrl = `/api/file/${data.downloadId}`;

        triggerDownloadLink(fileUrl, finalFilename);
        setStatusMessage({
          type: "success",
          text: "Download started!",
        });
        setUrl("");
        setCurrentProvider(null);
      }
    } catch (err: unknown) {
      console.error("Download failed:", err);
      setStatusMessage({
        type: "error",
        text: "Network error.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentProvider, url, noWatermark]);

  const isValid = !!(currentProvider && !currentProvider.unknown);
  const canToggleWatermark =
    isValid && WATERMARK_PROVIDER_IDS.has(currentProvider!.id);

  function DetectionBadge(): React.ReactElement {
    if (!currentProvider) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium transition-all duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600 block shadow-[0_0_8px_rgba(156,163,175,0.4)]" />
          <span>Waiting for link…</span>
        </div>
      );
    }

    if (currentProvider.unknown) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium transition-all duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <span>{currentProvider.name}</span>
        </div>
      );
    }

    const provider = currentProvider as DetectedProvider;
    return (
      <div className="flex items-center gap-2 text-sm font-medium transition-all duration-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
        <span className="text-white flex items-center gap-2">
          <svg
            className="w-4 h-4 text-emerald-400 fill-current"
            viewBox="0 0 24 24"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: provider.icon }}
          />
          Detected: {provider.name}
        </span>
      </div>
    );
  }

  return (
    <main className="w-full max-w-4xl mx-auto px-4 md:px-8 flex flex-col gap-8 md:gap-10 pb-10">
      <header className="text-center space-y-4 pt-8 md:pt-12">
        <div className="flex items-center justify-center gap-3 md:gap-4 mb-2">
          <div className="bg-white/5 p-2 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            <Image
              src="/icon.svg"
              alt="DownloadAnyVideo Logo"
              width={40}
              height={40}
              className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md brightness-110"
              priority
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white line-clamp-1">
            DownloadAnyVideo
          </h1>
        </div>
        <p className="text-gray-400 text-xs md:text-base max-w-lg mx-auto">
          Paste a link below from any of the 20+ supported providers.
        </p>
      </header>

      <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
        <div className="w-full relative">
          <div className="relative flex items-center">
            <input
              type="url"
              id="url-input"
              value={url}
              onChange={handleInput}
              placeholder="Paste a video URL here…"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent text-white placeholder-gray-600 border-b border-[#333] focus:border-white pb-3 pt-2 pr-20 focus:outline-none text-base md:text-xl tracking-wide transition-colors duration-300"
            />
            {!url && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      setUrl(text);
                      // Trigger synthetic event to run validation
                      handleInput({ target: { value: text } } as React.ChangeEvent<HTMLInputElement>);
                    }
                  } catch (err) {
                    console.error("Failed to read clipboard:", err);
                  }
                }}
                className="absolute right-0 bottom-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md cursor-pointer group"
              >
                <svg
                  className="w-3.5 h-3.5 transition-transform group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                Paste
              </button>
            )}
          </div>
          <div
            className="absolute bottom-0 left-0 h-[2px] bg-emerald-400 transition-all ease-out"
            style={{
              width: `${progress}%`,
              opacity: progress > 0 ? 1 : 0,
              transitionDuration: progress === 0 ? "0ms" : "400ms",
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <DetectionBadge />

          <div className="flex items-center gap-6">
            <WatermarkSwitch
              checked={noWatermark}
              onCheckedChange={setNoWatermark}
              disabled={!canToggleWatermark}
            />

            <button
              id="download-btn"
              onClick={() => void handleDownload()}
              disabled={!isValid || isLoading}
              aria-label="Download"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold tracking-wide hover:bg-gray-200 active:scale-95 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>Fetching…</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-[2px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="w-full max-w-2xl mx-auto -mt-4">
          <p
            className={[
              "text-xs font-medium tracking-wide transition-all duration-300",
              statusMessage.type === "error"
                ? "text-red-400"
                : statusMessage.type === "success"
                  ? "text-emerald-400"
                  : "text-gray-400",
            ].join(" ")}
          >
            {statusMessage.type === "error" && "✕ "}
            {statusMessage.type === "success" && "✓ "}
            {statusMessage.text}
          </p>
        </div>
      )}

      {linkMeta && (
        <div className="w-full max-w-2xl mx-auto">
          <p className="text-xs text-gray-500 font-medium tracking-wide">
            {linkMeta}
          </p>
        </div>
      )}

      < Marquee providers={PROVIDERS} />
    </main>
  );
}
