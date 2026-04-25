# Download Any Video

<p align="center">
  <img src="icon.svg" alt="downloadAnyVideo Icon" width="80" height="80" />
</p>

> A production‑ready Next.js 15 video downloader supporting **20+ providers** — YouTube, TikTok, Instagram, Reddit, Vimeo, Twitch, Dailymotion, LinkedIn, Pinterest, Snapchat, Telegram, Bilibili, VK, Flickr, Patreon, Rumble, Odysee, Likee, Facebook, and X / Twitter.

---

## Features

- 🎯 **Auto-provider detection** — paste any URL and the app identifies the platform in real time
- 🔇 **Watermark removal** — toggle available for TikTok, Instagram, Snapchat, and Likee
- 📜 **Infinite scrolling marquee** — all providers scroll continuously, pauses on hover
- 🔒 **URL sanitization** — blocks malicious schemes (`javascript:`, `data:`, `blob:`) before any processing
- 🌐 **Server-side API routes** — download logic runs on the server, never in the browser
- 🏗️ **TypeScript everywhere** — no `any` types, strict mode enabled

---

## Supported Providers

| Provider    | Watermark Removal |
| ----------- | ----------------- |
| YouTube     | —                 |
| TikTok      | ✅                |
| Instagram   | ✅                |
| Facebook    | —                 |
| X / Twitter | —                 |
| Reddit      | —                 |
| Vimeo       | —                 |
| Twitch      | —                 |
| Dailymotion | —                 |
| LinkedIn    | —                 |
| Pinterest   | —                 |
| Snapchat    | ✅                |
| Telegram    | —                 |
| Bilibili    | —                 |
| VK          | —                 |
| Flickr      | —                 |
| Patreon     | —                 |
| Rumble      | —                 |
| Odysee      | —                 |
| Likee       | ✅                |

---

## Setup

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm i -g pnpm`)

### Install & Run

```bash
# 1. Install dependencies
pnpm install

# 2. Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
pnpm build
pnpm start
```

---

## Project Structure

```
downloadanyvideo/
├── app/
│   ├── api/
│   │   └── download/
│   │       └── route.ts          # POST /api/download
│   ├── globals.css               # Tailwind v4 + marquee CSS
│   ├── layout.tsx                # Root layout with metadata
│   └── page.tsx                  # Main UI (client component)
├── components/
│   ├── Marquee.tsx               # Infinite scrolling provider marquee
│   └── WatermarkSwitch.tsx       # Radix UI accessible toggle
├── lib/
│   ├── downloaders.ts            # Server-side fetch strategies per provider
│   ├── providers.ts              # All 20 providers: id, name, icon, regex
│   └── sanitize.ts               # URL sanitization & multi-link detection
├── tailwind.config.ts            # Marquee keyframe + Tailwind theme
├── postcss.config.mjs            # @tailwindcss/postcss (v4)
└── _legacy/                      # Original index.html + download.js (archived)
```

---

## Download Strategy

Each provider uses the best available server-side approach:

| Provider        | Strategy                                                          |
| --------------- | ----------------------------------------------------------------- |
| **YouTube**     | `@distube/ytdl-core` → best video+audio format                    |
| **TikTok**      | tikwm.com public API (`wmplay` for no-watermark)                  |
| **Reddit**      | Public `.json` API → `secure_media.reddit_video`                  |
| **Vimeo**       | Player config endpoint → progressive streams                      |
| **Dailymotion** | Public fields API → `stream_h264_hd_url`                          |
| **Bilibili**    | Public `playurl` API → DASH stream                                |
| **Odysee**      | LBRY backend `resolve` API → `streaming_url`                      |
| **Rumble**      | Page scraping → embedded MP4 URL                                  |
| **Others**      | [Cobalt API](https://cobalt.tools) fallback → friendly auth error |

---

## Notes

- Providers requiring authentication (Facebook, Twitter/X, LinkedIn, etc.) first attempt the [Cobalt API](https://cobalt.tools) and fall back to a clear user-facing error message.
- **YouTube throttling:** YouTube aggressively rate-limits automated requests. If downloads fail, this is expected behaviour — no client keys are bundled.

---

## License

MIT
