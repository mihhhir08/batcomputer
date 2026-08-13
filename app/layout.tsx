import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BATCOMPUTER — 90-Day Mission Control",
  description: "A private tactical dashboard for tracking a 90-day body, career, audience, and consistency mission.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body><template hidden data-impeccable-direction dangerouslySetInnerHTML={{ __html: `<!--
THESIS: BATCOMPUTER is a private mission-control terminal; action leads, evidence verifies, and course correction keeps the operation moving.
OWN-WORLD: Nolan-era Batcomputer command array with true-black tactical surfaces, gunmetal structure, cold steel-blue focus and telemetry, forensic labels, and an original angular bat emblem.
STORY: Authenticate, read mission status, execute today's weighted priorities, then inspect telemetry, variance, body evidence, and milestones.
FIRST VIEWPORT: Bat emblem and terminal identity lead into mission status and today's operational queue; logging completed work remains the primary action.
FORM: Cave forensic command array, fourth grounded direction, seed fc249639.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->` }} />{children}</body></html>;
}
