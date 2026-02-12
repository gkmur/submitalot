import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Submitalot — Inventory Submission",
  description: "Ghost inventory itemization form",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
