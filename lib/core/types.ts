export interface NormalizedFormat {
  id: string; // The specific format_id to download
  quality: string;
  ext: string;
  size?: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface MediaResult {
  title: string;
  thumbnail: string | null;
  duration?: number;
  provider?: string;
  originalUrl: string;
  bestDownload: NormalizedFormat | null;
  groups: {
    video: NormalizedFormat[];
    audio: NormalizedFormat[];
    other: NormalizedFormat[];
  };
}
