import { siGmail, siGooglecalendar, siWhatsapp } from "simple-icons";

// Official brand marks (simple-icons, CC0). Colors are each brand's own hex.
const BRANDS = {
  whatsapp: siWhatsapp,
  gmail: siGmail,
  gcal: siGooglecalendar,
} as const;

export type BrandName = keyof typeof BRANDS;

export function BrandIcon({ name, className = "h-6 w-6", color }: { name: BrandName; className?: string; color?: string }) {
  const icon = BRANDS[name];
  return (
    <svg viewBox="0 0 24 24" className={className} fill={color ?? `#${icon.hex}`} aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

export const BRAND_HEX: Record<BrandName, string> = {
  whatsapp: `#${siWhatsapp.hex}`,
  gmail: `#${siGmail.hex}`,
  gcal: `#${siGooglecalendar.hex}`,
};
