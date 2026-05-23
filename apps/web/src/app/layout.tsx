import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ScaleProvider } from "@/components/layout/ScaleProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Communiculture",
  description: "A division of Futurefarmers — place yourself on a continuum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Providers>
          <ScaleProvider>{children}</ScaleProvider>
        </Providers>
      </body>
    </html>
  );
}
