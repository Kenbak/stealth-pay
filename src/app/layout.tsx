import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://stealthpay.app"),
  title: {
    default: "StealthPay | Private Payroll & Invoices on Solana",
    template: "%s | StealthPay",
  },
  description:
    "Private payroll and invoicing on Solana using zero-knowledge proofs. Pay employees and invoice clients without exposing wallet addresses or amounts on-chain. Built with ShadowWire ZK and Privacy Cash.",
  keywords: [
    "private payroll",
    "solana payroll",
    "crypto payroll",
    "zero knowledge proofs",
    "zk payments",
    "confidential payments",
    "privacy crypto",
    "private invoices",
    "web3 payroll",
    "stealthpay",
    "shadowwire",
    "privacy cash",
    "employee privacy",
    "crypto salary",
    "decentralized payroll",
  ],
  authors: [{ name: "StealthPay" }],
  creator: "StealthPay",
  publisher: "StealthPay",
  category: "Finance",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "StealthPay | Private Payroll & Invoices on Solana",
    description: "Pay your team and invoice clients privately using zero-knowledge proofs. No wallet addresses or amounts exposed on-chain.",
    type: "website",
    url: "https://stealthpay.app",
    siteName: "StealthPay",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StealthPay - Private Payroll on Solana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StealthPay | Private Payroll on Solana",
    description: "Pay your team privately using zero-knowledge proofs. No wallet addresses or amounts exposed.",
    images: ["/og-image.png"],
    creator: "@stealthpay",
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
  alternates: {
    canonical: "https://stealthpay.app",
  },
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
