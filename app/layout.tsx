import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BATCOMPUTER",
  description: "A private mission terminal for a goal challenge you define.",
  appleWebApp: { capable: true, title: "BATCOMPUTER", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#010406",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body>{children}</body></html>;
}
