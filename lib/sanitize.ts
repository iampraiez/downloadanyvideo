export function sanitizeUrl(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;

  let cleaned = raw.trim();

  const MAX_URL_LENGTH = 2048;
  if (cleaned.length > MAX_URL_LENGTH) return null;

  cleaned = cleaned.replace(/<[^>]*>/g, "");

  cleaned = cleaned.replace(/\s+/g, "");

  const schemeCheck = cleaned
    .split("")
    .filter((ch) => ch.charCodeAt(0) > 0x1f)
    .join("")
    .replace(/\s+/g, "")
    .toLowerCase();
  const dangerousSchemes = ["javascript:", "data:", "vbscript:", "blob:"];
  for (const scheme of dangerousSchemes) {
    if (schemeCheck.startsWith(scheme)) return null;
  }

  let urlToValidate = cleaned;
  if (!/^https?:\/\//i.test(urlToValidate)) {
    urlToValidate = "https://" + urlToValidate;
  }

  try {
    const parsed = new URL(urlToValidate);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return null;
    }

    return cleaned;
  } catch {
    return null;
  }
}

export function extractUrls(raw: string): string[] {
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  return (raw.match(urlRegex) ?? []).filter((u) => sanitizeUrl(u) !== null);
}
