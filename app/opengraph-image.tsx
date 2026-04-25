import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "DownloadAnyVideo – Download videos from YouTube, Instagram, TikTok, Facebook and 20+ platforms for free";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #000000 100%)",
          fontFamily: "'Inter', system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-200px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "800px",
            height: "600px",
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "88px",
            height: "88px",
            borderRadius: "24px",
            background: "rgba(255,255,255,0.08)",
            border: "1.5px solid rgba(255,255,255,0.12)",
            marginBottom: "32px",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect x="1.5" y="2" width="21" height="15.5" rx="4.5" fill="#ffffff" />
            <path d="M10.5 7v5.5l5-2.75z" fill="#000000" />
            <rect x="3.5" y="19.5" width="17" height="2.5" rx="1.25" fill="#ffffff" />
          </svg>
        </div>

        <div
          style={{
            fontSize: "72px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
            lineHeight: 1.05,
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          Download Any Video
        </div>

        <div
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.5)",
            fontWeight: 400,
            letterSpacing: "-0.3px",
            textAlign: "center",
            maxWidth: "820px",
          }}
        >
          YouTube · Instagram · TikTok · Facebook · Reddit · 20+ platforms
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "36px",
            padding: "10px 28px",
            borderRadius: "100px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)",
            fontSize: "20px",
            fontWeight: 500,
            letterSpacing: "0.3px",
          }}
        >
          Free · No watermark · No registration
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "36px",
            color: "rgba(255,255,255,0.2)",
            fontSize: "18px",
            letterSpacing: "0.5px",
          }}
        >
          downloadanyvideo.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
