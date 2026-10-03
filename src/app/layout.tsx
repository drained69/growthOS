import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: { default: "GrowthOS — your autonomous growth operator", template: "%s · GrowthOS" },
  description: "Give your AI a growth goal and a budget. GrowthOS finds evidence-backed customers, narratives and creators, spends USDC within hard limits on Arc, measures what works and moves the next dollar there.",
};

export const viewport: Viewport = { themeColor: "#0a0a0b", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
