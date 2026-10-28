import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  // Small data labels only, never the largest paint; measured: preloading it costs the home page 3 points.
  preload: false,
});

export const metadata: Metadata = {
  title: "Nightwatch · Network intrusion detection",
  description:
    "Network intrusion detection that flags attacks it recognizes, marks traffic it can't explain for review, and puts the most dangerous alerts first.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
