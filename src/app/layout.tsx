import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/site/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Handball Team Platform",
    template: "%s | Handball Team Platform",
  },
  description: "ハンドボールチームの運営と試合管理をひとつにつなぐチームプラットフォーム。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Handball",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10243a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
