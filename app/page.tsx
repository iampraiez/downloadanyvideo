"use client";

import { useState, useCallback, useEffect } from "react";
import { PROVIDERS, PLAYLIST_PATTERNS, type Provider } from "@/lib/providers";
import { sanitizeUrl, extractUrls } from "@/lib/sanitize";
import { MediaResult, NormalizedFormat } from "@/lib/core/types";
import Image from "next/image";
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

export default function HomePage(): React.ReactElement {
  const [url, setUrl] = useState<string>("");
  const [currentProvider, setCurrentProvider] = useState<CurrentProvider>(null);
  const [linkMeta, setLinkMeta] = useState<string | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    setUrl(raw);
    setLinkMeta(null);
    setMediaResult(null);
    setStatusMessage(null);

    if (!raw.trim()) {
      setCurrentProvider(null);
      return;
    }

    const allUrls = extractUrls(raw);
    if (allUrls.length > 1) {
      setCurrentProvider(null);
      setLinkMeta(`${allUrls.length} links detected — only single-video URLs are supported`);
      return;
    }

    const sanitized = sanitizeUrl(raw);

    if (!sanitized) {
      setCurrentProvider({ id: "unknown", name: "Invalid or unsafe URL", unknown: true });
      return;
    }

    const detected = PROVIDERS.find((p) => p.regex.test(sanitized));
    if (detected) {
      setCurrentProvider(detected as DetectedProvider);
      if (isPlaylist(sanitized, detected.id)) {
        setLinkMeta("Playlist or channel URL detected · all videos will be queued");
      }
    } else {
      setCurrentProvider({ id: "unknown", name: "Unknown provider", unknown: true });
    }
  }, []);

  const handlePreview = useCallback(async (): Promise<void> => {
    if (!currentProvider || currentProvider.unknown) {
      setStatusMessage({ type: "error", text: "No valid video link detected." });
      return;
    }

    const sanitized = sanitizeUrl(url);
    if (!sanitized) {
      setStatusMessage({ type: "error", text: "Invalid URL." });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    setMediaResult(null);

    try {
      const res = await fetch(`/api/preview?url=${encodeURIComponent(sanitized)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatusMessage({ type: "error", text: data.error ?? `Server error ${res.status}` });
        return;
      }

      setMediaResult(data);
      setUrl("");
      setStatusMessage({ type: "success", text: "Links fetched successfully!" });
    } catch (_err: unknown) {
      setStatusMessage({ type: "error", text: "Network error." });
    } finally {
      setIsLoading(false);
    }
  }, [currentProvider, url]);

  const handleDownload = useCallback(async (sourceUrl: string, vId: string, ext: string): Promise<void> => {
    if (downloadingId) return;
    setDownloadingId(vId);
    setStatusMessage(null);
    
    try {
      const title = mediaResult?.title || "video";
      const downloadUri = `/api/download?url=${encodeURIComponent(sourceUrl)}&formatId=${encodeURIComponent(vId)}&title=${encodeURIComponent(title)}&ext=${encodeURIComponent(ext)}`;
      
      const res = await fetch(downloadUri);
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Download failed: ${res.status}`);
      }
      
      const blob = await res.blob();
      const safeTitle = title.replace(/[^\w\s-]/g, "").slice(0, 80);
      const filename = `${safeTitle || "video"}.${ext}`;

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      setStatusMessage({ type: "success", text: "Download initiated successfully!" });
    } catch (_err: unknown) {
      const msg = _err instanceof Error ? _err.message : "Failed to download media.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setDownloadingId(null);
    }
  }, [downloadingId, mediaResult]);

  const isValid = !!(currentProvider && !currentProvider.unknown);

  return (
    <main className="min-h-screen w-full bg-[#070708] font-sans selection:bg-emerald-500/30 flex flex-col justify-between">
      
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-8 md:pt-16 pb-10 flex-col gap-8 md:gap-10">
        
        <header className="text-center space-y-4 mb-10 w-full transition-all duration-700">
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-2">
            <div className="bg-white/5 p-2 rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <Image src="/icon.svg" alt="Logo" width={40} height={40} className="w-8 h-8 md:w-10 md:h-10 drop-shadow-md brightness-110" priority />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white line-clamp-1">
              DownloadAnyVideo
            </h1>
          </div>
          <p className="text-gray-400 text-xs md:text-base max-w-lg mx-auto">
            Paste a link below from any of the 20+ supported providers.
          </p>
        </header>

        <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 relative z-20">
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
                      if (text && text.trim().startsWith("http")) {
                        setUrl(text);
                        handleInput({ target: { value: text } } as React.ChangeEvent<HTMLInputElement>);
                      }
                    } catch (_err) {}
                  }}
                  className="absolute right-0 bottom-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md cursor-pointer group"
                >
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                  <span className="hidden sm:inline">Paste</span>
                </button>
              )}
            </div>

            <div className="absolute bottom-0 left-0 h-[2px] bg-emerald-400 transition-all ease-out"
              style={{ width: `${progress}%`, opacity: progress > 0 ? 1 : 0, transitionDuration: progress === 0 ? "0ms" : "400ms" }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {currentProvider ? (
              currentProvider.unknown ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 font-medium transition-all duration-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  <span>{currentProvider.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium transition-all duration-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  <span className="text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: currentProvider.icon }} />
                    Detected: {currentProvider.name}
                  </span>
                </div>
              )
            ) : (
               <div className="flex items-center gap-2 text-sm text-gray-500 font-medium transition-all duration-300">
                 <span className="w-1.5 h-1.5 rounded-full bg-gray-600 block shadow-[0_0_8px_rgba(156,163,175,0.4)]" />
                 <span>Waiting for link…</span>
               </div>
            )}

            <button
              onClick={() => void handlePreview()}
              disabled={!isValid || isLoading || !!mediaResult}
              className="flex items-center justify-center w-auto gap-2 px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold tracking-wide hover:bg-gray-200 active:scale-95 transition-all duration-200 group focus:outline-none disabled:opacity-30 disabled:pointer-events-none"
            >
              {isLoading ? (
                <><svg className="w-4 h-4 animate-spin text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Fetching…</>
              ) : (
                <><svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-[2px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Download</>
              )}
            </button>
          </div>

          {statusMessage && (
            <div className="w-full mt-1">
              <p className={`text-xs font-medium tracking-wide transition-all duration-300 ${statusMessage.type === "error" ? "text-red-400" : statusMessage.type === "success" ? "text-emerald-400" : "text-gray-400"}`}>
                {statusMessage.type === "error" && "✕ "}
                {statusMessage.type === "success" && "✓ "}
                {statusMessage.text}
              </p>
            </div>
          )}

          {linkMeta && (
            <div className="w-full mt-1">
              <p className="text-xs text-gray-500 font-medium tracking-wide">{linkMeta}</p>
            </div>
          )}

        </div>

        {mediaResult && (
          <div className="w-full max-w-2xl mx-auto mt-6 bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/[0.08] rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-[fadeInUp_0.3s_ease-out_forwards] p-4 flex items-center gap-4 sm:gap-5 transition-all">
            <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            
            <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 relative rounded-2xl overflow-hidden bg-black/50 border border-white/5 shadow-inner">
              {mediaResult.thumbnail ? (
                <Image src={mediaResult.thumbnail} alt={mediaResult.title} fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/20">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <h2 className="text-base sm:text-lg font-semibold text-white/95 truncate">
                {mediaResult.title}
              </h2>
              
              <div className="flex items-center flex-wrap gap-2.5 mt-2 text-xs sm:text-[13px]">
                {mediaResult.bestDownload && (
                  <div className="flex items-center gap-1.5 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    <span className="font-bold text-emerald-400">{mediaResult.bestDownload.quality}</span>
                    <span className="text-emerald-400/50">•</span>
                    <span className="text-emerald-400/80 font-medium uppercase tracking-wider">{mediaResult.bestDownload.ext}</span>
                  </div>
                )}
                
                {(mediaResult.groups.video.length > 1 || mediaResult.groups.audio.length > 0 || mediaResult.groups.other.length > 0) && (
                  <details className="relative ml-auto group/dropdown">
                    <summary className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white transition-colors outline-none cursor-pointer list-none appearance-none [&::-webkit-details-marker]:hidden">
                      <span className="font-medium text-[11px] sm:text-xs tracking-wide">All Formats</span>
                      <svg className="w-3 h-3 opacity-80 group-open/dropdown:-scale-y-100 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </summary>
                    
                    <div className="absolute right-0 top-full mt-2 w-56 max-h-60 overflow-y-auto bg-[#171717] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] flex flex-col p-1 custom-scrollbar">
                      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }`}</style>
                      
                      {mediaResult.groups.video.length > 0 && (
                        <div className="mb-1">
                          <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest sticky top-0 bg-[#171717]">Video</div>
                          {mediaResult.groups.video.map((v: NormalizedFormat) => (
                            <button
                              key={`vid-${v.id}`}
                              onClick={() => void handleDownload(mediaResult.originalUrl, v.id, v.ext)}
                              className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors flex items-center justify-between group/item"
                            >
                              <span>{v.quality}</span>
                              <span className="text-[10px] opacity-50 group-hover/item:opacity-100 uppercase">{v.ext}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {mediaResult.groups.audio.length > 0 && (
                        <div className="mb-1 border-t border-white/5 pt-1">
                          <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest sticky top-0 bg-[#171717]">Audio</div>
                          {mediaResult.groups.audio.map((a: NormalizedFormat) => (
                            <button
                              key={`aud-${a.id}`}
                              onClick={() => void handleDownload(mediaResult.originalUrl, a.id, a.ext)}
                              className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors flex items-center justify-between group/item"
                            >
                              <span>{a.quality}</span>
                              <span className="text-[10px] opacity-50 group-hover/item:opacity-100 uppercase">{a.ext}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {mediaResult.groups.other.length > 0 && (
                        <div className="border-t border-white/5 pt-1">
                          <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest sticky top-0 bg-[#171717]">Other</div>
                          {mediaResult.groups.other.map((o: NormalizedFormat) => (
                            <button
                              key={`oth-${o.id}`}
                              onClick={() => void handleDownload(mediaResult.originalUrl, o.id, o.ext)}
                              className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-between group/item"
                            >
                              <span>{o.quality}</span>
                              <span className="text-[10px] opacity-50 group-hover/item:opacity-100 uppercase">{o.ext}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {mediaResult.bestDownload && (
              <button
                type="button"
                onClick={() => void handleDownload(mediaResult.originalUrl, mediaResult.bestDownload!.id, mediaResult.bestDownload!.ext)}
                disabled={downloadingId !== null}
                className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-white hover:bg-gray-200 text-black rounded-[18px] flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] active:scale-95"
                title={`Download ${mediaResult.bestDownload.quality} mp4`}
              >
                {downloadingId === mediaResult.bestDownload.id ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                ) : (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                )}
              </button>
            )}
          </div>
        )}

      </div>

      <div className="w-full mt-auto opacity-30 pb-4">
        <Marquee providers={PROVIDERS} />
      </div>
      
    </main>
  );
}
