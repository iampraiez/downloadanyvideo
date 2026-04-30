import { extractInfo, getDirectUrl, MediaResult } from "./core";

export const getMediaInfo = async (url: string): Promise<MediaResult> => {
  return extractInfo(url, "twitter");
};

export const getDownloadUrl = async (url: string, formatId?: string): Promise<string> => {
  return getDirectUrl(url, formatId);
};
