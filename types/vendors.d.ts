/**
 * Type declarations for npm packages that ship without TypeScript definitions.
 * These are minimal ambient modules that allow TypeScript to compile without errors.
 * The actual types are asserted at the call sites in lib/downloaders.ts.
 */

declare module "primesave-dl" {
  interface PrimeSaveOption {
    url?: string;
    quality?: string;
    type?: string;
    label?: string;
    extension?: string;
  }

  interface PrimeSaveResult {
    success: boolean;
    platform?: string;
    title?: string;
    options?: PrimeSaveOption[];
    error?: string;
  }

  function downloader(url: string): Promise<PrimeSaveResult>;
  export = downloader;
}

declare module "@faouzkk/tiktok-dl" {
  interface TikTokDlResult {
    url?: string;
    urls?: string[];
    wm?: string;
    nowm?: string;
    nowatermark?: string;
    no_watermark?: string;
    watermark?: string;
    [key: string]: string | string[] | undefined;
  }

  function tiktokDl(url: string): Promise<TikTokDlResult>;
  export = tiktokDl;
}
