import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Inter_Tight } from "next/font/google";
import { connection } from "next/server";
import { SerwistProvider } from "@serwist/turbopack/react";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
});

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Shuffle",
  title: { default: "Shuffle", template: "%s — Shuffle" },
  description: "Votre garde-robe et des idées de tenues chaque matin.",
  appleWebApp: {
    capable: true,
    title: "Shuffle",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rendered on demand so that every page gets the CSP nonce (see proxy.ts).
  await connection();

  return (
    <html lang="fr" className={`${interTight.variable} ${bodoniModa.variable} h-full`}>
      <body className="min-h-full">
        {/* No reload when the connection comes back: it would wipe a form being filled in. */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV === "development"}
          reloadOnOnline={false}
        >
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
