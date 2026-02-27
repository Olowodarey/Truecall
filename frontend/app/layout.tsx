import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrueCall - Football Prediction Platform",
  description:
    "Predict football match outcomes and compete on Stacks blockchain",
  other: {
    "talentapp:project_verification":
      "a8587b1ddf5ad241d5fe033e02e130bde9a721f31ffe783dae522147f47238802594ca293fa15c892284a33c933eb2b60adc7cc55ac9de711b2005dbb445a063",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
