import { Cinzel, Cormorant_Garamond, Jost, Frank_Ruhl_Libre, Heebo } from "next/font/google";

// Polices imposées par la charte HYMEA (CDC § 07), self-hostées par next/font.
// Chacune expose une variable CSS consommée par le thème Tailwind (globals.css).
// Les polices latines de la charte ne couvrant pas l'hébreu, on adjoint des
// repli hébraïques (serif + sans) pour un rendu RTL fidèle.

/** Titres & logotype — serif à capitales, gravé/lapidaire. */
export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

/** Corps de texte & accents — serif éditorial. */
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/** Labels, navigation, boutons — sans-serif géométrique. */
export const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

/** Repli serif hébraïque (titres & corps) — registre éditorial proche de la charte. */
export const frankRuhl = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-frank-ruhl",
  display: "swap",
});

/** Repli sans-serif hébraïque (labels, nav, boutons). */
export const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500"],
  variable: "--font-heebo",
  display: "swap",
});

/** Classe regroupant toutes les variables de police, à poser sur <html>. */
export const fontVariables = [
  cinzel.variable,
  cormorant.variable,
  jost.variable,
  frankRuhl.variable,
  heebo.variable,
].join(" ");
