import { notFound } from "next/navigation";

// Capture tout chemin non apparié sous une locale (ex. /fr/inconnu) et déclenche
// le 404 localisé (app/[locale]/not-found.tsx). Sans ce catch-all, Next servirait
// son 404 global générique, hors charte et non traduit.
export default function CatchAllNotFound() {
  notFound();
}
