import type { Metadata } from "next";
import { fontVariables } from "@/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "HYMEA — Conciergerie & nettoyage premium",
  description: "Conciergerie et nettoyage haut de gamme en Israël.",
};

// Layout racine provisoire (#21) : ancre les polices et la charte sur une page
// de démonstration. Il sera remplacé par le layout localisé app/[locale] en #22.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
