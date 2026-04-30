import { MediaResult } from "./types";
import { getMediaInfo as getYoutubeInfo, getDownloadUrl as getYoutubeDownload } from "../downloaders/youtube";
import { getMediaInfo as getTiktokInfo, getDownloadUrl as getTiktokDownload } from "../downloaders/tiktok";
import { getMediaInfo as getTwitterInfo, getDownloadUrl as getTwitterDownload } from "../downloaders/twitter";
import { getMediaInfo as getInstagramInfo, getDownloadUrl as getInstagramDownload } from "../downloaders/instagram";

const detectProvider = (url: string): string | null => {
  if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/twitter\.com|x\.com/i.test(url)) return "twitter";
  if (/instagram\.com/i.test(url)) return "instagram";
  return null;
};

export const getMediaInfo = async (url: string): Promise<MediaResult> => {
  const provider = detectProvider(url);

  if (!provider) {
    throw new Error("Unsupported URL or provider not detected");
  }

  switch (provider) {
    case "youtube":
      return await getYoutubeInfo(url);
    case "tiktok":
      return await getTiktokInfo(url);
    case "twitter":
      return await getTwitterInfo(url);
    case "instagram":
      return await getInstagramInfo(url);
    default:
      throw new Error(`Provider ${provider} is not supported`);
  }
};

export const getDownloadUrl = async (url: string, formatId?: string): Promise<string> => {
  const provider = detectProvider(url);

  if (!provider) {
    throw new Error("Unsupported URL or provider not detected");
  }

  switch (provider) {
    case "youtube":
      return await getYoutubeDownload(url, formatId);
    case "tiktok":
      return await getTiktokDownload(url, formatId);
    case "twitter":
      return await getTwitterDownload(url, formatId);
    case "instagram":
      return await getInstagramDownload(url, formatId);
    default:
      throw new Error(`Provider ${provider} is not supported`);
  }
};
