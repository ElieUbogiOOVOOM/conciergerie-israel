import type { BrowserContext, Page, Route } from "@playwright/test";
import type {
  CalendarFeedToken,
  Client,
  ClientAvecHistorique,
  Equipe,
  ExceptionDisponibilite,
  Intervenant,
  Paginated,
  Prestation,
  RegleHebdomadaire,
  RendezVous,
  RendezVousDetail,
  StatutRendezVous,
  TypeClient,
} from "@hymea/shared";

/**
 * Fixtures & mocks réseau pour les E2E du back-office. Aucun backend live :
 * toutes les routes API sont interceptées. Le client n'authentifie pas la signature du
 * JWT (il décode seulement le payload pour `exp`/`email`), d'où un jeton forgé.
 */

/** Forge un access token JWT (payload décodable en clair, signature factice). */
export function forgeJwt(email = "admin@hymea.com", ttlSeconds = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(
    JSON.stringify({ sub: "admin-1", email, exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  ).toString("base64");
  return `${header}.${payload}.sig`;
}

/** Date du jour au format YYYY-MM-DD (UTC) — base des créneaux de test. */
export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Instant ISO « aujourd'hui à HH:00 UTC » (mi-journée → même jour métier en Israël). */
export function todayAt(hourUtc: number): string {
  return `${todayDate()}T${String(hourUtc).padStart(2, "0")}:00:00.000Z`;
}

export function makePrestation(over: Partial<Prestation> = {}): Prestation {
  return {
    id: "prest-1",
    libelle: { fr: "Nettoyage premium", en: "Premium cleaning", he: "ניקוי" },
    description: null,
    cible: "particulier",
    dureeMinutes: 90,
    actif: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

export function makeClient(over: Partial<Client> = {}): Client {
  return {
    id: "client-1",
    nom: "Cohen",
    prenom: "Sarah",
    email: "sarah.cohen@example.com",
    telephone: "+972500000000",
    locale: "fr",
    anonymizedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

/** Fabrique un RDV détaillé cohérent (client + prestation imbriqués). */
export function makeRdv(over: Partial<RendezVousDetail> = {}): RendezVousDetail {
  const client = over.client ?? makeClient();
  const prestation = over.prestation ?? makePrestation();
  const debut = over.debut ?? todayAt(10);
  return {
    id: "rdv-1",
    clientId: client.id,
    prestationId: prestation.id,
    intervenantId: null,
    typeClient: (over.typeClient ?? "particulier") as TypeClient,
    statut: (over.statut ?? "NOUVEAU") as StatutRendezVous,
    debut,
    fin: over.fin ?? todayAt(11),
    adresse: "12 rue Herzl, Tel Aviv",
    message: null,
    surfaceM2: 80,
    nombrePieces: 3,
    locale: "fr",
    consentement: { accepte: true, date: "2026-01-01T00:00:00.000Z", version: "2026-06-v1" },
    reminderSentAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
    client,
    prestation,
    intervenant: over.intervenant ?? null,
  };
}

export function paginate(
  items: RendezVousDetail[],
  page = 1,
  pageSize = 100,
): Paginated<RendezVousDetail> {
  return { items, total: items.length, page, pageSize };
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

/** Enregistre les routes d'authentification. `refresh` pilote l'état de session. */
export async function mockAuth(
  page: Page,
  opts: { refresh: "ok" | "401"; email?: string } = { refresh: "401" },
): Promise<void> {
  await page.route(/\/api\/auth\/refresh$/, async (route) => {
    if (opts.refresh === "ok") {
      await fulfillJson(route, { accessToken: forgeJwt(opts.email) });
    } else {
      await fulfillJson(route, { message: "unauthorized" }, 401);
    }
  });
  await page.route(/\/api\/auth\/logout$/, (route) => route.fulfill({ status: 204, body: "" }));
}

/** Mock du login : 200 (jeton) si le mot de passe vaut `goodPassword`, sinon 401. */
export async function mockLogin(page: Page, goodPassword = "secret123"): Promise<void> {
  await page.route(/\/api\/auth\/login$/, async (route) => {
    const body = route.request().postDataJSON() as { email: string; password: string };
    if (body.password === goodPassword) {
      await fulfillJson(route, { accessToken: forgeJwt(body.email) });
    } else {
      await fulfillJson(route, { message: "Identifiants invalides." }, 401);
    }
  });
}

/** Mock du catalogue de prestations. */
export async function mockPrestations(page: Page, prestations = [makePrestation()]): Promise<void> {
  await page.route(/\/api\/prestations(\?|$)/, (route) => fulfillJson(route, prestations));
}

export function makeIntervenant(over: Partial<Intervenant> = {}): Intervenant {
  return {
    id: "interv-1",
    nom: "Levi",
    prenom: "Dan",
    equipeId: null,
    actif: true,
    ...over,
  };
}

export function makeEquipe(over: Partial<Equipe> = {}): Equipe {
  return { id: "equipe-1", nom: "Équipe Tel-Aviv", ...over };
}

export function makeFeedToken(over: Partial<CalendarFeedToken> = {}): CalendarFeedToken {
  return {
    id: "feed-1",
    label: "Agenda Google de Sarah",
    token: "tok-secret-1",
    revokedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

/** Mock de la liste des intervenants (respecte le filtre ?actif=). */
export async function mockIntervenants(page: Page, intervenants: Intervenant[]): Promise<void> {
  await page.route(/\/api\/intervenants(\?|$)/, (route) => {
    const url = new URL(route.request().url());
    const actif = url.searchParams.get("actif");
    const filtered =
      actif === null ? intervenants : intervenants.filter((i) => i.actif === (actif === "true"));
    return fulfillJson(route, filtered);
  });
}

/** Mock de la liste des équipes. */
export async function mockEquipes(page: Page, equipes: Equipe[]): Promise<void> {
  await page.route(/\/api\/equipes(\?|$)/, (route) => fulfillJson(route, equipes));
}

/** Mock de la liste des tokens d'abonnement iCal. */
export async function mockCalendarFeeds(page: Page, feeds: CalendarFeedToken[]): Promise<void> {
  await page.route(/\/api\/calendar-feeds(\?|$)/, (route) => fulfillJson(route, feeds));
}

/** Capture des URLs de liste interrogées (pour vérifier les query params). */
export interface ListCapture {
  urls: string[];
  /** Dernier query (URLSearchParams) interrogé. */
  last(): URLSearchParams;
}

/**
 * Mock de la liste RDV. `responder` reçoit les params et renvoie la page voulue ;
 * par défaut, renvoie `items` tels quels. Capture chaque URL appelée.
 */
export function mockRdvList(
  page: Page,
  responder: (params: URLSearchParams) => Paginated<RendezVousDetail>,
): ListCapture {
  const capture: ListCapture = {
    urls: [],
    last() {
      const url = this.urls[this.urls.length - 1] ?? "";
      return new URL(url).searchParams;
    },
  };
  void page.route(/\/api\/rendez-vous(\?|$)/, async (route) => {
    const url = route.request().url();
    capture.urls.push(url);
    await fulfillJson(route, responder(new URL(url).searchParams));
  });
  return capture;
}

/** Mock du détail RDV : 200 si l'id est connu, 404 sinon. */
export async function mockRdvDetail(
  page: Page,
  byId: Record<string, RendezVousDetail>,
): Promise<void> {
  await page.route(/\/api\/rendez-vous\/[A-Za-z0-9-]+$/, async (route) => {
    const id = route.request().url().split("/").pop() ?? "";
    const rdv = byId[id];
    if (rdv) await fulfillJson(route, rdv);
    else await fulfillJson(route, { message: "not found" }, 404);
  });
}

/** Pré-pose le cookie de présence pour traverser le middleware sans login. */
export async function seedSession(context: BrowserContext): Promise<void> {
  await context.addCookies([
    { name: "hymea_admin_session", value: "1", domain: "localhost", path: "/admin" },
  ]);
}

// ─────────────────── Actions sur un RDV (statut/replanif, #36) ───────────────

/** Capture des mutations d'un RDV (statut, attribution, replanification). */
export interface RdvActionCapture {
  statut: string[];
  intervenant: (string | null)[];
  reschedule: string[];
  current(): RendezVousDetail;
}

/**
 * Mock des actions sur un RDV : chaque PATCH applique la mutation et renvoie le
 * RDV à jour ; le GET détail renvoie l'état courant. Capture les charges utiles.
 */
export function mockRdvActions(page: Page, base: RendezVousDetail): RdvActionCapture {
  let current = base;
  const cap: RdvActionCapture = {
    statut: [],
    intervenant: [],
    reschedule: [],
    current: () => current,
  };

  void page.route(/\/api\/rendez-vous\/[^/]+\/statut$/, async (route) => {
    const body = route.request().postDataJSON() as { statut: StatutRendezVous };
    cap.statut.push(body.statut);
    current = { ...current, statut: body.statut };
    await fulfillJson(route, current);
  });
  void page.route(/\/api\/rendez-vous\/[^/]+\/intervenant$/, async (route) => {
    const body = route.request().postDataJSON() as { intervenantId: string | null };
    cap.intervenant.push(body.intervenantId);
    current = { ...current, intervenantId: body.intervenantId };
    await fulfillJson(route, current);
  });
  void page.route(/\/api\/rendez-vous\/[^/]+\/replanification$/, async (route) => {
    const body = route.request().postDataJSON() as { debut: string };
    cap.reschedule.push(body.debut);
    current = { ...current, statut: "REPLANIFIE", debut: body.debut };
    await fulfillJson(route, current);
  });
  // GET détail (enregistré en dernier : tenté en premier, ne matche que l'URL simple).
  void page.route(/\/api\/rendez-vous\/[^/]+$/, (route) => fulfillJson(route, current));

  return cap;
}

// ─────────────────────────── Clients (#37) ──────────────────────────────────

export function makeRendezVous(over: Partial<RendezVous> = {}): RendezVous {
  return {
    id: "rdv-h1",
    clientId: "client-1",
    prestationId: "prest-1",
    intervenantId: null,
    typeClient: "particulier",
    statut: "REALISE",
    debut: "2026-05-01T08:00:00.000Z",
    fin: "2026-05-01T09:30:00.000Z",
    adresse: "12 rue Herzl, Tel Aviv",
    message: null,
    surfaceM2: 80,
    nombrePieces: 3,
    locale: "fr",
    consentement: { accepte: true, date: "2026-01-01T00:00:00.000Z", version: "2026-06-v1" },
    reminderSentAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...over,
  };
}

/** Mock de la liste paginée des clients. Capture les URLs interrogées. */
export function mockClientsList(
  page: Page,
  responder: (params: URLSearchParams) => Paginated<Client>,
): ListCapture {
  const capture: ListCapture = {
    urls: [],
    last() {
      const url = this.urls[this.urls.length - 1] ?? "";
      return new URL(url).searchParams;
    },
  };
  void page.route(/\/api\/clients(\?|$)/, async (route) => {
    const url = route.request().url();
    capture.urls.push(url);
    await fulfillJson(route, responder(new URL(url).searchParams));
  });
  return capture;
}

/** Mock de la fiche client + historique (200 si id connu, 404 sinon). */
export async function mockClientHistorique(
  page: Page,
  byId: Record<string, ClientAvecHistorique>,
): Promise<void> {
  await page.route(/\/api\/clients\/[^/]+\/rendez-vous$/, async (route) => {
    const id = route.request().url().split("/").slice(-2)[0] ?? "";
    const data = byId[id];
    if (data) await fulfillJson(route, data);
    else await fulfillJson(route, { message: "not found" }, 404);
  });
}

/** Capture des actions RGPD sur un client (anonymisation, suppression). */
export interface ClientRgpdCapture {
  anonymized: string[];
  deleted: string[];
}

/**
 * Mock des actions RGPD. `anonymize` renvoie le client anonymisé ; `remove`
 * renvoie 204. Capture les ids ciblés.
 */
export function mockClientRgpd(page: Page, client: Client): ClientRgpdCapture {
  const cap: ClientRgpdCapture = { anonymized: [], deleted: [] };
  void page.route(/\/api\/clients\/[^/]+\/anonymisation$/, async (route) => {
    cap.anonymized.push(route.request().url());
    await fulfillJson(route, {
      ...client,
      nom: "—",
      prenom: "—",
      email: "anon@hymea.com",
      telephone: "—",
      anonymizedAt: "2026-06-26T00:00:00.000Z",
    });
  });
  void page.route(/\/api\/clients\/[A-Za-z0-9-]+$/, async (route) => {
    if (route.request().method() === "DELETE") {
      cap.deleted.push(route.request().url());
      await route.fulfill({ status: 204, body: "" });
    } else {
      await route.fallback();
    }
  });
  return cap;
}

// ─────────────────────── Disponibilités (#38) ───────────────────────────────

export function makeRegle(over: Partial<RegleHebdomadaire> = {}): RegleHebdomadaire {
  return { id: "regle-1", jour: 1, debut: "09:00", fin: "18:00", ...over };
}

export function makeException(over: Partial<ExceptionDisponibilite> = {}): ExceptionDisponibilite {
  return {
    id: "exc-1",
    debut: "2026-07-14T00:00:00.000Z",
    fin: "2026-07-14T23:59:59.999Z",
    bloque: true,
    motif: "Jour férié",
    ...over,
  };
}

/** État mutable d'un mock de disponibilités. */
export interface DispoState {
  regles: RegleHebdomadaire[];
  exceptions: ExceptionDisponibilite[];
}

/**
 * Mock CRUD des disponibilités sur un état en mémoire : GET renvoie l'état,
 * POST ajoute (id incrémental), DELETE retire. Permet de tester l'optimisme UI.
 */
export function mockDisponibilites(page: Page, initial: Partial<DispoState> = {}): DispoState {
  const state: DispoState = {
    regles: initial.regles ?? [],
    exceptions: initial.exceptions ?? [],
  };
  let seq = 100;

  void page.route(/\/api\/disponibilites\/regles\/[^/]+$/, async (route) => {
    const id = route.request().url().split("/").pop() ?? "";
    state.regles = state.regles.filter((r) => r.id !== id);
    await route.fulfill({ status: 204, body: "" });
  });
  void page.route(/\/api\/disponibilites\/regles$/, async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Omit<RegleHebdomadaire, "id">;
      const created: RegleHebdomadaire = { id: `regle-${seq++}`, ...body };
      state.regles.push(created);
      await fulfillJson(route, created);
    } else {
      await fulfillJson(route, state.regles);
    }
  });

  void page.route(/\/api\/disponibilites\/exceptions\/[^/]+$/, async (route) => {
    const id = route.request().url().split("/").pop() ?? "";
    state.exceptions = state.exceptions.filter((x) => x.id !== id);
    await route.fulfill({ status: 204, body: "" });
  });
  void page.route(/\/api\/disponibilites\/exceptions$/, async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Omit<ExceptionDisponibilite, "id">;
      const created: ExceptionDisponibilite = { id: `exc-${seq++}`, ...body };
      state.exceptions.push(created);
      await fulfillJson(route, created);
    } else {
      await fulfillJson(route, state.exceptions);
    }
  });

  return state;
}
