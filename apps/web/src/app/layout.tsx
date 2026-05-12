import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixelify",
  display: "swap",
});

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
      <body className={pixelifySans.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
