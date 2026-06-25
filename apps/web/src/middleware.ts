import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Middleware i18n : détection de langue au 1er passage, redirection vers l'URL
// préfixée et mémorisation par cookie. Le matcher exclut /api et /admin (résolus
// en amont par le reverse-proxy) ainsi que les internes Next et les fichiers.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
