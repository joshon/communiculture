import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ScaleProvider } from "@/components/layout/ScaleProvider";

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
      <body>
        <Providers>
          <ScaleProvider>{children}</ScaleProvider>
        </Providers>
      </body>
    </html>
  );
}
