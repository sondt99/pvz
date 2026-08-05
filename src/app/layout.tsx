import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plants vs. Zombies — Web Adventure",
  description:
    "Defend your lawn in this Plants vs. Zombies web adventure. Unlock plants, survive waves, and progress through Day, Night, Pool, Fog, and Roof.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
