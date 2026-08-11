import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum — 90-Day Transformation",
  description: "A free 90-day operating system for building your body, career, audience, and consistency.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark"><body><template hidden data-impeccable-direction dangerouslySetInnerHTML={{ __html: `<!--
THESIS: Momentum is a live execution ledger, not a card gallery; action leads and analysis proves.
OWN-WORLD: Midnight or paper-white operational canvas, graphite rules, coral live state, blue and green data, compact controls, and tabular numerals.
STORY: See the remaining mission, complete weighted work, then read trends, weekly change, body evidence, and milestones.
FIRST VIEWPORT: Brand and challenge status lead into a three-column summary and the complete daily operating ledger; the primary action is recording today's work.
FORM: Mission-control ledger, fourth grounded direction, seed 8de5f1cd.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->` }} />{children}</body></html>;
}
