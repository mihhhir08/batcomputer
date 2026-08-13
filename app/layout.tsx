import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum — 90-Day Transformation",
  description: "A personal 90-day operating system for building your body, career, audience, and consistency.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body><template hidden data-impeccable-direction dangerouslySetInnerHTML={{ __html: `<!--
THESIS: Momentum is a live execution ledger, not a card gallery; action leads and analysis proves.
OWN-WORLD: True-black tactical canvas, gunmetal rules, signal-yellow action and focus, desaturated steel-blue telemetry, green completion, expressive sans headlines, and mono operational numerals.
STORY: See the remaining mission, record weighted work directly, then read trends, weekly change, body evidence, and milestones.
FIRST VIEWPORT: Brand and challenge status lead directly into today's weighted commitments; recording completed work is the primary action.
FORM: Mission-control ledger, fourth grounded direction, seed 8de5f1cd.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->` }} />{children}</body></html>;
}
