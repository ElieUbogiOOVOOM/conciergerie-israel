import type { routing } from "@/i18n/routing";
import type messages from "./messages/fr.json";

// Type-safety next-intl : la locale et la forme des messages dérivent de la
// config de routing et du bundle FR (référence). Clés manquantes = erreur TS.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}

// API JavaScript Cloudflare Turnstile (chargée dynamiquement, #29). Typage
// minimal des seules méthodes utilisées par le widget anti-spam du funnel.
interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  appearance?: "always" | "execute" | "interaction-only";
  size?: "normal" | "flexible" | "compact";
  theme?: "auto" | "light" | "dark";
  language?: string;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}
