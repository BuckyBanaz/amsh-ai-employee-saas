import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE } from "@/lib/site";

// Shared social preview image for every route (file-based metadata applies to all nested segments).
export const alt = `${SITE.name} - ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public", SITE.logo));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #ffffff 0%, #eff6ff 55%, #dbeafe 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={72} height={72} alt="" style={{ borderRadius: "16px" }} />
          <div style={{ fontSize: 44, fontWeight: 700, color: "#0f172a" }}>{SITE.name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ fontSize: 68, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{SITE.tagline}</div>
          <div style={{ fontSize: 32, color: "#334155", lineHeight: 1.35 }}>
            Answers patient calls & WhatsApp 24/7 and books appointments.
          </div>
        </div>
        <div style={{ fontSize: 26, color: "#2563eb", fontWeight: 600 }}>getamsh.com</div>
      </div>
    ),
    { ...size },
  );
}
