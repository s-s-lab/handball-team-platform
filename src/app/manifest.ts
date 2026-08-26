import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Handball Team Platform",
    short_name: "Handball",
    description: "ハンドボールチームの運営と試合管理をひとつにつなぐチームプラットフォーム。",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#10243a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
