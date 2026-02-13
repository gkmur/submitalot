import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Airtable Dev Panel",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
