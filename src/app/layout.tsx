import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PixelGo | Zero-Server Peer-to-Peer File Transfer",
  description:
    "Transfer files directly between devices with zero cloud servers. Encrypted locally with WebRTC and AES-256 for instant, unlimited P2P file sharing.",
  keywords: [
    "PixelGo",
    "P2P file transfer",
    "zero server file sharing",
    "peer to peer file transfer",
    "encrypted file transfer",
    "WebRTC file transfer",
    "AirDrop alternative",
    "direct file sharing",
  ],
  authors: [{ name: "PixelGo" }],
  creator: "PixelGo",
  publisher: "PixelGo",
  metadataBase: new URL("https://pixelgo.tech"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PixelGo | Zero-Server Peer-to-Peer File Transfer",
    description:
      "Instant, zero-server file transfers powered by WebRTC and E2E encryption. Direct device-to-device sharing with no file size limits.",
    url: "https://pixelgo.tech",
    siteName: "PixelGo",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelGo | Zero-Server Peer-to-Peer File Transfer",
    description:
      "Transfer files through physical space at lightning speed. Zero cloud servers, zero limits, 100% private.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Structured Data for Google Search & AI Overviews
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PixelGo",
  url: "https://pixelgo.tech",
  applicationCategory: "UtilityApplication",
  operatingSystem: "All",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "PixelGo (pixelgo.tech) is a zero-server, peer-to-peer file transfer tool that lets you securely share files directly between devices over a web browser without uploading them to an intermediate cloud server.",
  featureList: [
    "Direct Peer-to-Peer (P2P) WebRTC transfers",
    "Zero cloud server storage",
    "End-to-End AES-256 local encryption",
    "Optical QR code scanner pairing",
    "No file size limits",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}