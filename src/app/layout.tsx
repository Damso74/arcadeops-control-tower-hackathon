import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Lot 4a — Decision §6-A acted: V2 punchline rolled out across the
// hero, README, deck, video and SEO metadata. Gemini = judge,
// Vultr = runtime, ArcadeOps = enforcement. The V1 ("Gemini runs the
// agent. Vultr executes the workflow. ArcadeOps decides if it can
// ship.") is preserved as historical context inside `README.md` and
// the implementation plans, never shown to a jury again.
export const metadata: Metadata = {
  title: "ArcadeOps Control Tower",
  description:
    "Gemini judges. Vultr runs. ArcadeOps blocks unsafe autonomous agents before production.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
