"use client";

import type { TypeClient } from "@hymea/shared";
import { usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

// Associe le premier segment de l'URL (locale déjà retirée par next-intl) au
// type de client porté par le funnel RDV (#28). Toute page hors univers
// (accueil, groupe, mentions légales…) mène au funnel générique sans pré-filtre.
const PATH_TO_TYPE: Record<string, TypeClient> = {
  particuliers: "particulier",
  entreprises: "entreprise",
  "centres-commerciaux": "mall",
};

function rdvHrefFor(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const type = PATH_TO_TYPE[segment];
  return type ? `/rdv?type=${type}` : "/rdv";
}

/**
 * CTA du bloc contact, adaptatif selon la page : il pointe vers le funnel RDV
 * pré-filtré sur l'univers courant (particuliers / entreprises / centres
 * commerciaux) ou, ailleurs, vers le funnel générique. Remplace l'ancien
 * `mailto:` qui restait inopérant sans client mail configuré.
 */
export function ContactCta({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Button href={rdvHrefFor(pathname)} variant="primary">
      {children}
    </Button>
  );
}
