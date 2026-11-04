import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const instrumentSerif = localFont({
  src: "../public/fonts/InstrumentSerif-Regular.ttf",
  variable: "--font-heading",
  display: "swap",
});

const satoshi = localFont({
  src: [
    {
      path: "../public/fonts/Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#FFFBFC",
};

export const metadata: Metadata = {
  title: "Christone Couples - Private space for two",
  description: "Talk, pray, play. Built for kingdom couples.",
  openGraph: {
    title: "Christone Couples - Private space for two",
    description: "Talk, pray, play. Built for kingdom couples.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Christone Couples - A private space for two",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Christone Couples - Private space for two",
    description: "Talk, pray, play. Built for kingdom couples.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${satoshi.variable}`}>
      <body className="font-body bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
