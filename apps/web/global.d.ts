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
