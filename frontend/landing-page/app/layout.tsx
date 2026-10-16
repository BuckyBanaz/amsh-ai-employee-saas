import type { Metadata } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./landing.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getamsh.com"),
  title: "AI Receptionist for Clinics & Dentists | AMSh (getamsh.com)",
  description:
    "Meet AMSh, your AI virtual front-desk employee at getamsh.com. Answer clinic calls 24/7, manage appointment requests, handle follow-ups and help your team respond faster.",
  alternates: {
    canonical: "https://getamsh.com",
  },
  openGraph: {
    title: "AI Receptionist for Clinics & Dentists | AMSh",
    description:
      "Meet AMSh, your AI virtual front-desk employee. Answer clinic calls 24/7, manage appointment requests, handle follow-ups and help your team respond faster.",
    url: "https://getamsh.com",
    siteName: "AMSh - getamsh.com",
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/landing/amsh_logo.png",
    apple: "/landing/amsh_logo.png",
  },
};

import PilotModal from "@/components/landing/PilotModal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-white antialiased">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} font-sans bg-white text-slate-900 min-h-full flex flex-col selection:bg-blue-100 selection:text-blue-900`}
      >
        <PilotModal />
        {children}
      </body>
    </html>
  );
}
