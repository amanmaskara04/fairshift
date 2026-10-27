import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Tamil, Noto_Sans_Telugu } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Toaster } from "sonner";
import "./globals.css";

// Self-hosted at build time (no runtime call to Google), so CSP keeps font-src 'self'.
const latin = Noto_Sans({ subsets: ["latin"], weight: ["400", "700"], display: "swap", variable: "--font-latin" });
// Signage-style display face for headings, and a ledger mono for money and hours (Latin glyphs only;
// Indic text falls through to the Noto face for that script).
const archivo = Archivo({ subsets: ["latin"], weight: ["600", "800"], display: "swap", variable: "--font-archivo" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--font-plex-mono" });
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-devanagari",
});
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["400", "700"], display: "swap", preload: false, variable: "--font-tamil" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: ["400", "700"], display: "swap", preload: false, variable: "--font-telugu" });

const FONT_FOR_LOCALE: Record<string, { variable: string; cssVar: string }> = {
  en: { variable: latin.variable, cssVar: "--font-latin" },
  hi: { variable: devanagari.variable, cssVar: "--font-devanagari" },
  ta: { variable: tamil.variable, cssVar: "--font-tamil" },
  te: { variable: telugu.variable, cssVar: "--font-telugu" },
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return { title: "FairShift", description: t("subtitle"), applicationName: "FairShift" };
}

export const viewport: Viewport = {
  themeColor: "#1e5b4a",
  width: "device-width",
  initialScale: 1,
  // Lets env(safe-area-inset-*) keep the tab bar clear of Android gesture bars and notches.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  const font = FONT_FOR_LOCALE[locale] ?? FONT_FOR_LOCALE.en;

  return (
    <html lang={locale} className={`${latin.variable} ${font.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans" style={{ ["--font-active" as string]: `var(${font.cssVar}), var(--font-latin)` }}>
        <a href="#main" className="skip-link">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
            {children}
          </SerwistProvider>
        </NextIntlClientProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
