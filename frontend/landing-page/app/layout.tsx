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

// Site-wide defaults only. No canonical here on purpose: Next merges metadata shallowly, so a canonical set in the layout
// would be inherited by every page that forgets its own and mark it a duplicate of the home page. Pages use pageMetadata().
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: `${SITE.tagline} | ${SITE.name}`,
  description: SITE.description,
  applicationName: SITE.name,
  publisher: SITE.publisher.name,
  authors: [{ name: SITE.publisher.name, url: SITE.publisher.url }],
  category: "Healthcare software",
  formatDetection: { telephone: false, email: false, address: false },
  // Let search and AI answer engines quote long snippets and show large previews.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 },
  },
  openGraph: { siteName: SITE.name, locale: SITE.locale, type: "website", url: SITE.url },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: SITE.logo,
    apple: SITE.logo,
  },
};

import PilotModal from "@/components/landing/PilotModal";
import JsonLd from "@/components/landing/JsonLd";
import { SITE } from "@/lib/site";
import { organizationSchema, websiteSchema } from "@/lib/schema";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-white antialiased">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${sora.variable} ${jetbrainsMono.variable} font-sans bg-white text-slate-900 min-h-full flex flex-col selection:bg-blue-100 selection:text-blue-900`}
      >
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <PilotModal />
        {children}
      </body>
    </html>
  );
}
