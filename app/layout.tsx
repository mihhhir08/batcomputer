import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum — 90-Day Transformation",
  description: "A private operating system for building your body, career, and creative consistency.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
