import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "StealthPay | Private Payroll on Solana",
  description:
    "Payroll where salaries stay confidential. Forever. Built with Privacy Cash on Solana.",
  keywords: [
    "payroll",
    "privacy",
    "solana",
    "crypto",
    "zk-proofs",
    "confidential",
  ],
  authors: [{ name: "StealthPay Team" }],
  openGraph: {
    title: "StealthPay | Private Payroll on Solana",
    description: "Payroll where salaries stay confidential. Forever.",
    type: "website",
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
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
