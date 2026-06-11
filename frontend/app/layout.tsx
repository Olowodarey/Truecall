import type { Metadata } from "next";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { wagmiConfig } from "@/lib/wagmi";

export const metadata: Metadata = {
  title: "TrueCall - Football Prediction Platform",
  description:
    "Predict football match outcomes and compete on Stacks blockchain",
  other: {
    "talentapp:project_verification":
      "a8587b1ddf5ad241d5fe033e02e130bde9a721f31ffe783dae522147f47238802594ca293fa15c892284a33c933eb2b60adc7cc55ac9de711b2005dbb445a063",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(
    wagmiConfig,
    (await headers()).get("cookie"),
  );

  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProviders initialState={initialState}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
