"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

type FeatureFlipCardProps = {
  /** Titre de la prestation (recto + libellé de l'emplacement photo). */
  title: string;
  /** Chapô éditorial (peut contenir l'emphase `<b>` via t.rich). */
  description: ReactNode;
  /** Texte « photographie à venir » localisé, affiché au dos. */
  photoCaption: string;
  /** Photographie réelle révélée au dos (sinon placeholder). */
  photoSrc?: string;
  /** Texte alternatif localisé de la photographie. */
  photoAlt?: string;
  /** Invite à retourner la carte (recto), ex. « Voir la photo ». */
  flipHint?: string;
  /** Invite à revenir au texte (dos), ex. « Revenir ». */
  flipBackHint?: string;
};

/**
 * Carte de prestation qui se retourne au clic (flip 3D) pour révéler
 * l'emplacement photo au dos. Le bouton porte tout le carré : un second clic
 * (ou Entrée/Espace) revient au recto. Sur mobile la carte occupe toute la
 * largeur et reste suffisamment haute pour que la photo prenne la place.
 *
 * `prefers-reduced-motion` neutralise la rotation (bascule instantanée), sans
 * jamais masquer le contenu.
 */
export function FeatureFlipCard({
  title,
  description,
  photoCaption,
  photoSrc,
  photoAlt,
  flipHint,
  flipBackHint,
}: FeatureFlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={flipped}
      onClick={() => setFlipped((value) => !value)}
      className="group block h-full w-full cursor-pointer text-left [perspective:1200px]"
    >
      <div
        className={[
          "relative min-h-[22rem] w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] motion-reduce:transition-none sm:min-h-[19rem]",
          flipped ? "[transform:rotateY(180deg)]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Recto — texte éditorial */}
        <div className="absolute inset-0 flex flex-col border border-encre/10 bg-ivoire p-6 transition-colors [backface-visibility:hidden] group-hover:border-or">
          <h3 className="font-title text-[length:var(--text-h3)] text-encre">{title}</h3>
          <p className="mt-3 text-base leading-relaxed text-encre/70">{description}</p>
          {flipHint && (
            <span className="mt-auto inline-flex items-center gap-2 pt-6 font-label text-xs uppercase tracking-[0.25em] text-or-profond">
              {flipHint}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </span>
          )}
        </div>

        {/* Dos — emplacement photo */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <PhotoPlaceholder
            label={title}
            caption={photoCaption}
            ratio="auto"
            className="h-full w-full"
            src={photoSrc}
            alt={photoAlt}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
          {flipBackHint &&
            (photoSrc ? (
              // Sur photo, un cartouche ivoire garantit la lisibilité du libellé
              // quel que soit le visuel (le placeholder sable garde son ton discret).
              <span className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-ivoire/90 px-3 py-1 text-center font-label text-xs uppercase tracking-[0.25em] text-encre/70">
                {flipBackHint}
              </span>
            ) : (
              <span className="absolute bottom-4 left-0 right-0 text-center font-label text-xs uppercase tracking-[0.25em] text-encre/40">
                {flipBackHint}
              </span>
            ))}
        </div>
      </div>
    </button>
  );
}
