import type { Metadata } from "next";
import { Inter, Padauk } from "next/font/google";

import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const padauk = Padauk({
  weight: ["400", "700"],
  subsets: ["myanmar"],
  variable: "--font-myanmar",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SwanAar II Electronics MES",
  description: "Management & service system for SwanAar II Electronics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(inter.variable, padauk.variable)}>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased"
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
