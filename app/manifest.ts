import type { MetadataRoute } from "next";

// Installed as an app, the terminal gets its own Dock icon and its own window
// with no tab strip, no address bar, and no other tabs to glance at.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BATCOMPUTER",
    short_name: "BATCOMPUTER",
    description: "Private 90-day mission terminal",
    start_url: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#010406",
    theme_color: "#010406",
    categories: ["productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
