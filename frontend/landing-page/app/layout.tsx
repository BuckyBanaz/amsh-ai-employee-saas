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
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AMSh — The 24/7 AI Receptionist for Modern Clinics",
  description:
    "Never miss another patient call. AMSh answers your clinic phones 24/7 in fluent Hindi, English and Hinglish, books slots directly in your calendar, and sends WhatsApp confirmations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-white antialiased">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} font-sans bg-white text-slate-900 min-h-full flex flex-col selection:bg-blue-100 selection:text-blue-900`}
      >
        {children}
      </body>
    </html>
  );
}
