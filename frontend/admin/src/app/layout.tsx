import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin Portal",
  description: "Amsh Platform Administration",
  icons: {
    icon: "/landing/amsh_logo.png",
    apple: "/landing/amsh_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${plusJakartaSans.className} min-h-full flex flex-col bg-gray-50 text-gray-900`}>{children}</body>
    </html>
  );
}
