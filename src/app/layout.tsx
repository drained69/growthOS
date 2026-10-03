import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "GrowthOS — your autonomous growth operator",
  description: "Give your AI a growth goal and a budget. GrowthOS finds evidence-backed customers, narratives and creators, spends USDC within hard limits on Arc, measures what works and moves the next dollar there.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
