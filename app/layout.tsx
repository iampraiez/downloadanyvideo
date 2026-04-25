import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

const BASE_URL = "https://downloadanyvideo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Download Any Video — Free Video Downloader",
    template: "%s | DownloadAnyVideo",
  },
  description:
    "Download videos from YouTube, Instagram, TikTok, Facebook, Reddit, and 20+ other platforms instantly, for free, with no watermarks.",
  keywords: [
    "download video",
    "video downloader",
    "youtube downloader",
    "tiktok downloader no watermark",
    "instagram downloader",
    "facebook video downloader",
    "reddit video downloader",
    "free video downloader",
  ],
  authors: [{ name: "Praise Olaoye", url: "https://iampraiez.vercel.app" }],
  creator: "Praise Olaoye",
  publisher: "DownloadAnyVideo",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    title: "Download Any Video",
    description: "Download videos from YouTube, Instagram, TikTok, Facebook and 20+ platforms for free.",
    siteName: "DownloadAnyVideo",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@iampraiez",
    title: "Download Any Video",
    description: "Download videos from YouTube, Instagram, TikTok, Facebook and 20+ platforms for free without watermarks.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: {
      url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='1.5' y='2' width='21' height='15.5' rx='4.5' fill='%23000000'/%3E%3Cpath d='M10.5 7v5.5l5-2.75z' fill='%23ffffff' stroke='%23ffffff' stroke-width='2' stroke-linejoin='round'/%3E%3Crect x='3.5' y='19.5' width='17' height='2.5' rx='1.25' fill='%23000000'/%3E%3C/svg%3E",
      type: "image/svg+xml",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DownloadAnyVideo",
    description: "Download videos from 20+ platforms without watermark",
    url: BASE_URL,
    author: {
      "@type": "Person",
      name: "Praise Olaoye",
      url: "https://iampraiez.vercel.app",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
  };

  return (
    <html lang="en">
      <head>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] antialiased bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111] via-[#0a0a0a] to-[#000]">
        {children}
      </body>
    </html>
  );
}
