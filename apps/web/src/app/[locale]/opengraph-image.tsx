import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { isLocale, type Locale } from "@hymea/shared";
import { routing } from "@/i18n/routing";

// Image Open Graph de marque (#31), générée par locale. Visuel sobre fidèle à la
// charte HYMEA (fond crème, encre charbon, or chaud) : monogramme mandala, le
// logotype « HYMEA » en capitales gravées et la baseline traduite. Sert aussi de
// Twitter card (Next réutilise l'image OG faute de twitter-image dédiée).

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "HYMEA — The office conciergerie";

// Pré-génère une image par locale à la compilation.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Palette charte (valeurs hex source de vérité, cf. README § Design system).
const CREME = "#f4ece2";
const IVOIRE = "#faf5ee";
const ENCRE = "#36322c";
const OR = "#c5863f";
const OR_PROFOND = "#9c6526";

const PETAL_OUTER = "M50 50 C40 30 44 13 50 6 C56 13 60 30 50 50 Z";
const PETAL_INNER = "M50 50 C43 40 43 29 50 23 C57 29 57 40 50 50 Z";
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Charge une police Google au format ttf/otf (compatible Satori) restreinte au
 * texte rendu, pour un payload minimal. Renvoie null en cas d'échec afin de ne
 * jamais casser le build/rendu (Satori retombe sur sa police par défaut).
 */
async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    const res = await fetch(fontUrl);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Meta" });
  const tagline = t("ogTagline");
  const rtl = locale === "he";

  // « HYMEA » est latin (Cinzel) quelle que soit la locale ; la baseline emploie
  // une police adaptée au script (Heebo pour l'hébreu, Cormorant sinon).
  const wordmark = "HYMEA";
  const taglineFamily = rtl ? "Heebo" : "Cormorant Garamond";
  const [cinzel, taglineFont] = await Promise.all([
    loadGoogleFont("Cinzel", 600, wordmark),
    loadGoogleFont(taglineFamily, 500, tagline),
  ]);

  const fonts = [
    cinzel && { name: "Cinzel", data: cinzel, weight: 600 as const, style: "normal" as const },
    taglineFont && {
      name: taglineFamily,
      data: taglineFont,
      weight: 500 as const,
      style: "normal" as const,
    },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 600 | 500; style: "normal" }[];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: CREME,
        color: ENCRE,
        padding: 80,
        position: "relative",
      }}
    >
      {/* Filet or supérieur */}
      <div
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 10, background: OR }}
      />

      {/* Monogramme mandala (8 pétales, trait fin or) */}
      <svg
        width={150}
        height={150}
        viewBox="0 0 100 100"
        fill="none"
        stroke={OR}
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ marginBottom: 36 }}
      >
        {ANGLES.map((a) => (
          <path key={`o${a}`} d={PETAL_OUTER} transform={`rotate(${a} 50 50)`} />
        ))}
        {ANGLES.map((a) => (
          <path key={`i${a}`} d={PETAL_INNER} transform={`rotate(${a} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="3.2" />
      </svg>

      {/* Logotype */}
      <div
        style={{
          fontFamily: cinzel ? "Cinzel" : "serif",
          fontSize: 132,
          fontWeight: 600,
          letterSpacing: 18,
          color: ENCRE,
          lineHeight: 1,
          paddingLeft: 18,
        }}
      >
        {wordmark}
      </div>

      {/* Séparateur or */}
      <div style={{ width: 120, height: 3, background: OR, margin: "32px 0" }} />

      {/* Baseline traduite */}
      <div
        style={{
          fontFamily: taglineFont ? taglineFamily : "serif",
          fontSize: 44,
          color: OR_PROFOND,
          textAlign: "center",
          maxWidth: 880,
          direction: rtl ? "rtl" : "ltr",
        }}
      >
        {tagline}
      </div>

      {/* Mention discrète */}
      <div
        style={{
          position: "absolute",
          bottom: 48,
          fontSize: 22,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: ENCRE,
          opacity: 0.72,
          background: IVOIRE,
          padding: "8px 22px",
          borderRadius: 999,
        }}
      >
        The office conciergerie · Israël
      </div>
    </div>,
    { ...size, fonts },
  );
}
