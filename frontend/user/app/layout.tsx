import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amsh — AI Receptionist Platform",
  description: "AI-powered receptionist for your business. Handles calls, books appointments, and answers FAQs 24/7.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className={`${plusJakartaSans.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
