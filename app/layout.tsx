import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Arbitrage Terminal",
  description: "Real-time crypto arbitrage intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ background: "#0D1117" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0D1117] text-[#E6EDF3]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
