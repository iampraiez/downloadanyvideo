type LogLevel = "info" | "success" | "warn" | "error" | "progress";

const LEVEL_COLOURS: Record<LogLevel, string> = {
  info: "\x1b[36m",
  success: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
  progress: "\x1b[35m",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

function pad(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

export function log(
  level: LogLevel,
  context: string,
  message: string,
  extra?: Record<string, string | number | boolean>,
): void {
  const colour = LEVEL_COLOURS[level];
  const label = pad(`[${level.toUpperCase()}]`, 11);
  const ctx = BOLD + pad(`[${context}]`, 16) + RESET;
  const ts = DIM + timestamp() + RESET;

  const extraStr = extra
    ? "  " +
      Object.entries(extra)
        .map(([k, v]) => `${DIM}${k}=${RESET}${String(v)}`)
        .join("  ")
    : "";

  console.log(`${ts}  ${colour}${label}${RESET}  ${ctx}  ${message}${extraStr}`);
}

const BARS = "████████████████████";
const EMPTY = "░░░░░░░░░░░░░░░░░░░░";
const BAR_WIDTH = 20;

export function progressBar(label: string, step: number, total: number): void {
  const pct = Math.round((step / total) * 100);
  const filled = Math.round((step / total) * BAR_WIDTH);
  const bar = BARS.slice(0, filled) + EMPTY.slice(filled);

  const colour = step === total ? LEVEL_COLOURS.success : LEVEL_COLOURS.progress;
  const ts = DIM + timestamp() + RESET;

  console.log(
    `${ts}  ${colour}[PROGRESS]${RESET}  ${BOLD}${pad(`[${label}]`, 16)}${RESET}  ${colour}${bar}${RESET}  ${pct}%`,
  );
}

export function logRequest(
  provider: string,
  url: string,
  noWatermark: boolean,
): void {
  log("info", "api/download", "Incoming download request", {
    provider,
    noWatermark,
    url: url.length > 60 ? url.slice(0, 57) + "..." : url,
  });
}

export function logStrategy(provider: string, strategy: string): void {
  log("progress", provider, `Trying strategy: ${strategy}`);
}

export function logFallback(provider: string, reason: string): void {
  log("warn", provider, `Primary strategy failed, trying Cobalt fallback`, {
    reason: reason.slice(0, 80),
  });
}

export function logSuccess(
  provider: string,
  downloadUrl: string,
  durationMs: number,
): void {
  log("success", provider, "Download URL resolved", {
    duration: `${durationMs}ms`,
    host: (() => {
      try {
        return new URL(downloadUrl).hostname;
      } catch {
        return "unknown";
      }
    })(),
  });
}

export function logFailure(
  provider: string,
  error: string,
  durationMs: number,
): void {
  log("error", provider, "All strategies failed", {
    duration: `${durationMs}ms`,
    error: error.slice(0, 100),
  });
}
