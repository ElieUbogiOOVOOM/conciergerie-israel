"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/** Charge le script Turnstile une seule fois et résout quand l'API est prête. */
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("turnstile")), { once: true });
    document.head.appendChild(script);
  });
}

type TurnstileProps = {
  /** Remonte le jeton (ou "" quand le widget est désactivé/expiré). */
  onToken: (token: string) => void;
};

/**
 * Widget anti-spam Cloudflare Turnstile, en mode discret (`interaction-only` :
 * invisible tant qu'aucun défi n'est requis). Dégradation gracieuse : sans site
 * key configurée, rien n'est rendu et un jeton vide est remonté — le back skippe
 * alors la vérification (TURNSTILE_SECRET vide) et le honeypot reste actif (#29).
 */
export function Turnstile({ onToken }: TurnstileProps) {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!SITE_KEY) {
      onToken("");
      return;
    }

    let widgetId: string | undefined;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          appearance: "interaction-only",
          size: "flexible",
          language: locale,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch(() => {
        // Script injoignable : on n'empêche pas la soumission (honeypot + back).
        if (!cancelled) onToken("");
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
    // Dépendances stables (onToken via useCallback, locale figée pendant le
    // parcours) : l'effet ne se rejoue pas en pratique.
  }, [locale, onToken]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="mt-4" />;
}
