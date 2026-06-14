import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plants vs. Zombies Web",
  description: "A scalable web clone built with Next.js, Neon Postgres, and Zustand",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
