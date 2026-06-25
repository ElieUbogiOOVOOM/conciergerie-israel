import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/api";

// Garde du back-office : redirige vers /login en l'absence de cookie de présence
// (la sécurité réelle est portée par le Bearer côté API ; ce cookie non secret
// ne sert qu'à l'aiguillage UX, le cookie refresh httpOnly étant illisible ici).
// Pose aussi X-Robots-Tag pour garantir le noindex (défense en profondeur).
// NB : avec basePath /admin, `pathname` ne contient PAS le préfixe /admin.
const LOGIN_PATH = "/login";
const HOME_PATH = "/planning";

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isLogin = pathname === LOGIN_PATH;

  // Session absente → tout chemin protégé renvoie au login.
  if (!hasSession && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return withNoindex(NextResponse.redirect(url));
  }

  // Session présente → la page de login renvoie vers le planning.
  if (hasSession && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = HOME_PATH;
    return withNoindex(NextResponse.redirect(url));
  }

  return withNoindex(NextResponse.next());
}

function withNoindex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Exclut les internes Next, l'icône et tout fichier (assets).
  matcher: ["/((?!_next|favicon.ico|icon.svg|logo.svg|.*\\..*).*)"],
};
