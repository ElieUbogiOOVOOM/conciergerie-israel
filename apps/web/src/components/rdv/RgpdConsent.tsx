"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Turnstile } from "./Turnstile";

type RgpdConsentProps = {
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  /** Valeur du honeypot (doit rester vide). */
  website: string;
  onWebsiteChange: (value: string) => void;
  /** Jeton Turnstile remonté au funnel. */
  onToken: (token: string) => void;
};

/**
 * Bloc conformité du funnel (#29) : consentement RGPD obligatoire, honeypot
 * invisible et widget Turnstile. Le consentement est contrôlé par le funnel
 * (il conditionne l'activation du bouton Valider et la valeur envoyée à l'API).
 * Le label renvoie à la politique de confidentialité (#30).
 */
export function RgpdConsent({
  consent,
  onConsentChange,
  website,
  onWebsiteChange,
  onToken,
}: RgpdConsentProps) {
  const t = useTranslations("Rdv.consent");

  return (
    <div className="space-y-6">
      {/* Honeypot : invisible et hors tab order ; rempli = bot rejeté côté API. */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="rdv-website">{t("honeypotLabel")}</label>
        <input
          id="rdv-website"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => onWebsiteChange(event.target.value)}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onConsentChange(event.target.checked)}
          aria-required
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-or-profond)]"
        />
        <span className="text-[length:var(--text-lead)] leading-relaxed text-encre/80">
          {t.rich("label", {
            policy: (chunks: ReactNode) => (
              <Link
                href="/politique-confidentialite"
                className="text-or-profond underline underline-offset-4 hover:text-encre"
              >
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>

      <Turnstile onToken={onToken} />
    </div>
  );
}
