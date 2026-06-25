import { Cinzel, Jost } from "next/font/google";

// Polices de la charte HYMEA pour le back-office (#32) : Jost en UI (labels,
// navigation, tableaux — lisibilité en usage quotidien) et Cinzel pour les
// titres (registre lapidaire de la marque). Self-hostées par next/font.

/** Titres — serif à capitales, gravé/lapidaire. */
export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cinzel",
  display: "swap",
});

/** UI : labels, navigation, boutons, corps de tableau — sans-serif géométrique. */
export const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

/** Classe regroupant les variables de police, à poser sur <html>. */
export const fontVariables = [cinzel.variable, jost.variable].join(" ");
