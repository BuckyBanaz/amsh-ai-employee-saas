import React from 'react';
import { PROVIDER_ICONS } from './providerIcons';

interface ProviderLogoProps {
  id: string;
  name: string;
  size?: number;
  className?: string;
}

/**
 * High-fidelity brand mark tile for infrastructure integration providers.
 */
export function ProviderLogo({ id, name, size = 36, className = "" }: ProviderLogoProps) {
  const icon = PROVIDER_ICONS[id];
  const inner = Math.round(size * 0.58);
  return (
    <div
      role="img"
      aria-label={`${name} logo`}
      className={`flex shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white shadow-2xs transition-all hover:border-[#2563EB]/40 ${className}`}
      style={{ width: size, height: size }}
    >
      {icon ? (
        <svg
          viewBox={icon.viewBox}
          width={inner}
          height={inner}
          aria-hidden="true"
          focusable="false"
          className="shrink-0"
          dangerouslySetInnerHTML={{ __html: icon.markup }}
        />
      ) : (
        <span aria-hidden="true" className="select-none text-[11px] font-bold tracking-tight text-[#475569] uppercase">
          {name.trim().slice(0, 2)}
        </span>
      )}
    </div>
  );
}
