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

      {/* Monogramme mandala officiel (or chaud) */}
      <svg width={150} height={150} viewBox="0 -8.5 223 223" fill={OR} style={{ marginBottom: 36 }}>
        <g transform="matrix(1.4103672,0,0,1.2460464,-46.012378,-13.398345)">
          <ellipse cx="111.5" cy="95.790962" rx="6.4862695" ry="6.2882404" />
          <path d="M 106.28544,87.564442 C 105.31854,77.2124 102.10193,67.625724 86.54779,62.236354 c 0.95075,12.778134 7.52997,21.22083 19.73765,25.328088 z" />
          <g>
            <g>
              <path d="m 116.71456,87.564442 c 0.9669,-10.352042 4.18351,-19.938718 19.73765,-25.328088 -0.95075,12.778134 -7.52997,21.22083 -19.73765,25.328088 z" />
              <path d="m 111.49951,15.054199 4.9e-4,7.331972 c 11.94952,16.533926 31.2336,10.50914 30.45361,39.850645 -0.41726,15.696734 -14.38154,27.721852 -30.4541,30.824707 v 2.729004 c 16.07256,-3.102855 32.15752,-14.865957 32.6543,-33.553711 1.03651,-38.991454 -20.31624,-25.597631 -32.6543,-47.182617 z" />
            </g>
            <path d="M 111.50049,15.054199 111.5,22.386171 c -11.94952,16.533926 -31.2336,10.50914 -30.45361,39.850645 0.41726,15.696734 14.38154,27.721852 30.4541,30.824707 v 2.729004 C 95.42793,92.687672 79.34297,80.92457 78.84619,62.236816 77.80968,23.245362 99.16243,36.639185 111.50049,15.054199 Z" />
          </g>
          <path d="m 121.21924,95.24708 c 8.9898,-5.223341 18.66266,-8.170635 32.08157,1.364033 -10.95569,6.645117 -21.64955,6.190437 -32.08157,-1.364033 z" />
          <path d="m 181.42055,55.424447 -6.34943,3.66641 c -8.34404,18.615551 6.51562,32.303661 -19.28486,46.298923 -13.80241,7.48701 -31.1986,1.40615 -41.92203,-10.961671 l -2.36339,1.364502 c 10.72343,12.367819 28.95306,20.416249 45.38552,11.502599 34.28584,-18.598084 12.01007,-30.393197 24.53419,-51.870763 z" />
          <path d="m 181.42104,55.425295 -6.34992,3.665562 C 154.77756,57.009232 150.35314,37.296336 125.33265,52.64258 111.9475,60.852304 108.51559,78.958285 113.86472,94.428957 l -2.36339,1.364502 c -5.34913,-15.470672 -3.20446,-35.282207 12.73122,-45.056308 33.24933,-20.393371 32.32631,4.795564 57.18849,4.688144 z" />
          <g transform="rotate(120,111.49837,95.79272)">
            <g>
              <path d="m 116.71456,87.564442 c 0.9669,-10.352042 4.18351,-19.938718 19.73765,-25.328088 -0.95075,12.778134 -7.52997,21.22083 -19.73765,25.328088 z" />
              <path d="m 111.49951,15.054199 4.9e-4,7.331972 c 11.94952,16.533926 31.2336,10.50914 30.45361,39.850645 -0.41726,15.696734 -14.38154,27.721852 -30.4541,30.824707 v 2.729004 c 16.07256,-3.102855 32.15752,-14.865957 32.6543,-33.553711 1.03651,-38.991454 -20.31624,-25.597631 -32.6543,-47.182617 z" />
            </g>
            <path d="M 111.50049,15.054199 111.5,22.386171 c -11.94952,16.533926 -31.2336,10.50914 -30.45361,39.850645 0.41726,15.696734 14.38154,27.721852 30.4541,30.824707 v 2.729004 C 95.42793,92.687672 79.34297,80.92457 78.84619,62.236816 77.80968,23.245362 99.16243,36.639185 111.50049,15.054199 Z" />
          </g>
          <g transform="rotate(180,111.49837,95.79272)">
            <g>
              <path d="m 116.71456,87.564442 c 0.9669,-10.352042 4.18351,-19.938718 19.73765,-25.328088 -0.95075,12.778134 -7.52997,21.22083 -19.73765,25.328088 z" />
              <path d="m 111.49951,15.054199 4.9e-4,7.331972 c 11.94952,16.533926 31.2336,10.50914 30.45361,39.850645 -0.41726,15.696734 -14.38154,27.721852 -30.4541,30.824707 v 2.729004 c 16.07256,-3.102855 32.15752,-14.865957 32.6543,-33.553711 1.03651,-38.991454 -20.31624,-25.597631 -32.6543,-47.182617 z" />
            </g>
            <path d="M 111.50049,15.054199 111.5,22.386171 c -11.94952,16.533926 -31.2336,10.50914 -30.45361,39.850645 0.41726,15.696734 14.38154,27.721852 30.4541,30.824707 v 2.729004 C 95.42793,92.687672 79.34297,80.92457 78.84619,62.236816 77.80968,23.245362 99.16243,36.639185 111.50049,15.054199 Z" />
          </g>
          <g>
            <path d="m 41.57619,136.16099 6.349429,-3.66641 c 8.34404,-18.61555 -6.515618,-32.30366 19.284866,-46.29892 13.8024,-7.487009 31.198598,-1.406147 41.922025,10.961671 l 2.36339,-1.364502 C 100.77247,83.425011 82.542844,75.376578 66.110385,84.290231 31.82454,102.88831 54.100306,114.68343 41.57619,136.16099 Z" />
            <path d="m 41.5757,136.16014 6.349919,-3.66556 c 20.29356,2.08163 24.717982,21.79452 49.738476,6.44828 13.385145,-8.20972 16.817055,-26.3157 11.467925,-41.786377 l 2.36339,-1.364502 c 5.34913,15.470669 3.20446,35.282209 -12.731215,45.056309 C 65.51486,161.24166 66.437876,136.05272 41.5757,136.16014 Z" />
          </g>
          <g transform="rotate(60,111.50033,95.792471)">
            <path d="m 41.57619,136.16099 6.349429,-3.66641 c 8.34404,-18.61555 -6.515618,-32.30366 19.284866,-46.29892 13.8024,-7.487009 31.198598,-1.406147 41.922025,10.961671 l 2.36339,-1.364502 C 100.77247,83.425011 82.542844,75.376578 66.110385,84.290231 31.82454,102.88831 54.100306,114.68343 41.57619,136.16099 Z" />
            <path d="m 41.5757,136.16014 6.349919,-3.66556 c 20.29356,2.08163 24.717982,21.79452 49.738476,6.44828 13.385145,-8.20972 16.817055,-26.3157 11.467925,-41.786377 l 2.36339,-1.364502 c 5.34913,15.470669 3.20446,35.282209 -12.731215,45.056309 C 65.51486,161.24166 66.437876,136.05272 41.5757,136.16014 Z" />
          </g>
          <path d="m 101.45648,95.24708 c -8.989804,-5.223341 -18.662664,-8.170635 -32.081574,1.364033 10.95569,6.645117 21.64955,6.190437 32.081574,-1.364033 z" />
          <g>
            <path d="M 122.57611,51.8951 C 120.29468,46.017831 116.05671,42.130393 111.5,38.64746 v 7.840003 c 3.12155,2.300101 5.23979,6.037982 6.66026,9.056972 z" />
            <path d="m 100.42389,51.8951 c 2.28143,-5.877269 6.5194,-9.764707 11.07611,-13.24764 v 7.840003 c -3.12155,2.300101 -5.23979,6.037982 -6.66026,9.056972 z" />
          </g>
          <g transform="rotate(59.90203,111.49844,95.790771)">
            <path d="M 122.57611,51.8951 C 120.29468,46.017831 116.05671,42.130393 111.5,38.64746 v 7.840003 c 3.12155,2.300101 5.23979,6.037982 6.66026,9.056972 z" />
            <path d="m 100.42389,51.8951 c 2.28143,-5.877269 6.5194,-9.764707 11.07611,-13.24764 v 7.840003 c -3.12155,2.300101 -5.23979,6.037982 -6.66026,9.056972 z" />
          </g>
          <g transform="rotate(120.10631,111.49844,95.790772)">
            <path d="M 122.57611,51.8951 C 120.29468,46.017831 116.05671,42.130393 111.5,38.64746 v 7.840003 c 3.12155,2.300101 5.23979,6.037982 6.66026,9.056972 z" />
            <path d="m 100.42389,51.8951 c 2.28143,-5.877269 6.5194,-9.764707 11.07611,-13.24764 v 7.840003 c -3.12155,2.300101 -5.23979,6.037982 -6.66026,9.056972 z" />
          </g>
          <g transform="rotate(-179.89387,111.49844,95.790773)">
            <path d="M 122.57611,51.8951 C 120.29468,46.017831 116.05671,42.130393 111.5,38.64746 v 7.840003 c 3.12155,2.300101 5.23979,6.037982 6.66026,9.056972 z" />
            <path d="m 100.42389,51.8951 c 2.28143,-5.877269 6.5194,-9.764707 11.07611,-13.24764 v 7.840003 c -3.12155,2.300101 -5.23979,6.037982 -6.66026,9.056972 z" />
          </g>
          <g transform="rotate(-119.7368,111.49844,95.790774)">
            <path d="M 122.57611,51.8951 C 120.29468,46.017831 116.05671,42.130393 111.5,38.64746 v 7.840003 c 3.12155,2.300101 5.23979,6.037982 6.66026,9.056972 z" />
            <path d="m 100.42389,51.8951 c 2.28143,-5.877269 6.5194,-9.764707 11.07611,-13.24764 v 7.840003 c -3.12155,2.300101 -5.23979,6.037982 -6.66026,9.056972 z" />
          </g>
          <g transform="rotate(-59.7368,111.49844,95.790777)">
            <path d="M 122.57611,51.8951 C 120.29468,46.017831 116.05671,42.130393 111.5,38.64746 v 7.840003 c 3.12155,2.300101 5.23979,6.037982 6.66026,9.056972 z" />
            <path d="m 100.42389,51.8951 c 2.28143,-5.877269 6.5194,-9.764707 11.07611,-13.24764 v 7.840003 c -3.12155,2.300101 -5.23979,6.037982 -6.66026,9.056972 z" />
          </g>
        </g>
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
