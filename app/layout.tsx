import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BATCOMPUTER",
  description: "A private tactical terminal for a 90-day body, career, audience and consistency mission.",
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
  return <html lang="en" data-theme="dark"><body><template hidden data-impeccable-direction dangerouslySetInnerHTML={{ __html: `<!--
THESIS: BATCOMPUTER is a private mission-control terminal; action leads, evidence verifies, and course correction keeps the operation moving.
OWN-WORLD: Arkham-inspired evidence network with true-black scan fields, asymmetric command rails, cold blue phosphor signals, compact instrumentation, and an original winged command mark.
STORY: Authenticate, read mission status, execute today's weighted priorities, then inspect telemetry, variance, body evidence, and milestones.
FIRST VIEWPORT: A wide command mast and mission status lead into the active dossier and connected live-instrument rail; logging completed work remains the primary action.
FORM: Arkham evidence network, user-pinned canon, seed 3ccdc911.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->` }} />{children}</body></html>;
}
