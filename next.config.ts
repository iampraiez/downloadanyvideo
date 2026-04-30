import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["youtube-dl-exec"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "video.twimg.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.tiktokcdn.com" },
    ],
  },
};

export default nextConfig;
