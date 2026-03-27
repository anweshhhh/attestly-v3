import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";

const uiFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap"
});

const accentFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-accent",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Attestly V3",
  description: "Evidence-first security questionnaire autofill with citations, review, and export."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${uiFont.variable} ${accentFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
