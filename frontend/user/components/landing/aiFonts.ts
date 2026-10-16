import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

// Shared "AI product" typography for the landing page's technical sections: a geometric sans for headings and names, and a
// monospace for machine-style labels. Put `${aiSans.variable} ${aiMono.variable}` on a section's root to use AI / MONO inside it.
export const aiSans = Space_Grotesk({ subsets: ["latin"], variable: "--font-ai", display: "swap" });
export const aiMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-ai-mono", display: "swap" });

export const AI = "font-[family-name:var(--font-ai)]";
export const MONO = "font-[family-name:var(--font-ai-mono)]";
