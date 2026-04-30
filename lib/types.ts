export interface MediaVariant {
  url: string;
  quality: string;
}

export interface MediaResult {
  title: string;
  thumbnail: string | null;
  variants: MediaVariant[];
}
