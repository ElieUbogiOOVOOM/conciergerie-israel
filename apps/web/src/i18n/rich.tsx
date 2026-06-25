import type { ReactNode } from "react";

/**
 * Chunks de texte riche réutilisables pour next-intl (`t.rich`). Permettent de
 * mettre en emphase des segments du copy éditorial directement depuis les
 * fichiers de messages (`… <b>lift spending by up to +70%.</b>`).
 *
 * Emphase volontairement sobre : graisse semi-bold, jamais un gras 700 brutal,
 * étranger au registre « luxe à la française » de la charte.
 *
 * `emphasis` : sur surfaces claires (crème/ivoire/sable) — encre plein pour
 * relever le segment au-dessus du texte courant (`text-encre/70-75`).
 * `emphasisInherit` : sur panneaux sombre ou or — on conserve la couleur du
 * texte courant (crème / ivoire) et on n'agit que sur la graisse, pour éviter
 * un encre dissonant sur fond coloré.
 */
export const emphasis = {
  b: (chunks: ReactNode) => <strong className="font-semibold text-encre">{chunks}</strong>,
};

export const emphasisInherit = {
  b: (chunks: ReactNode) => <strong className="font-semibold">{chunks}</strong>,
};
