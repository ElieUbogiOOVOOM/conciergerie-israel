import { getRequestConfig } from "next-intl/server";
import { isLocale } from "@hymea/shared";
import { routing } from "./routing";

// Configuration de requête next-intl : résout la locale demandée (repli FR si
// invalide) et charge le bundle de messages correspondant.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
