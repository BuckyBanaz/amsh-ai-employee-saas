import type { Metadata } from "next";
import JsonLd from "@/components/landing/JsonLd";
import { pageMetadata } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/schema";

// docs/page.tsx is a client component and cannot export metadata, so its SEO lives in this server layout.
export const metadata: Metadata = pageMetadata({
  path: "/docs",
  title: "Developer Documentation & APIs | AMSh",
  description:
    "Connect your clinic telephony, WhatsApp Cloud channels and Google Calendar to AMSh AI virtual employees. Low-latency WebSockets, telephony media streams and REST APIs.",
});

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={breadcrumbSchema("/docs")} />
      {children}
    </>
  );
}
