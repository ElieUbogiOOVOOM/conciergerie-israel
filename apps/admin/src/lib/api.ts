import type {
  CalendarFeedToken,
  Client,
  ClientAvecHistorique,
  Equipe,
  ExceptionDisponibilite,
  I18nText,
  Intervenant,
  Paginated,
  Prestation,
  RegleHebdomadaire,
  RendezVousDetail,
  StatutRendezVous,
  TypeClient,
} from "@hymea/shared";

/**
 * Client HTTP du back-office. En production, admin et API sont servis sur le même
 * domaine (hymea.elie-ubogi.com/admin & /api) : une base RELATIVE `/api` suffit et
 * garantit l'envoi du cookie refresh (httpOnly, scopé /api/auth) en same-origin.
 * En dev, surcharger via NEXT_PUBLIC_API_URL (ex. http://localhost:4000/api).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "");

/** Cookie de présence (NON secret) lu par le middleware pour la redirection login. */
export const SESSION_COOKIE = "hymea_admin_session";

/** Erreur d'API porteuse du statut HTTP. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// --- Access token en mémoire (jamais en localStorage : limite l'exposition XSS) ---
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Pose/efface le cookie de présence (path /admin) consommé par le middleware. */
function setSessionCookie(present: boolean): void {
  if (typeof document === "undefined") return;
  // `Secure` dès que la page est servie en HTTPS (production derrière le reverse-proxy).
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "";
  document.cookie = present
    ? `${SESSION_COOKIE}=1; path=/admin; max-age=2592000; samesite=lax${secure}`
    : `${SESSION_COOKIE}=; path=/admin; max-age=0; samesite=lax${secure}`;
}

/** Échéance (ms epoch) encodée dans l'access token JWT, pour le refresh anticipé. */
export function accessTokenExpiry(): number | null {
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1] ?? "")) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

interface AccessTokenResponse {
  accessToken: string;
}

/** Authentifie l'admin : pose le cookie refresh (API) + le cookie de présence. */
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, res.status === 401 ? "Identifiants invalides." : "Erreur");
  }
  const data = (await res.json()) as AccessTokenResponse;
  setAccessToken(data.accessToken);
  setSessionCookie(true);
}

/**
 * Rafraîchit silencieusement l'access token via le cookie refresh httpOnly.
 * Retourne true si une session valide a été réhydratée, false sinon.
 */
export async function refresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      setAccessToken(null);
      setSessionCookie(false);
      return false;
    }
    const data = (await res.json()) as AccessTokenResponse;
    setAccessToken(data.accessToken);
    setSessionCookie(true);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

/** Déconnecte : révoque le refresh token (API) et nettoie l'état local. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // Best-effort : on nettoie l'état local quoi qu'il arrive.
  }
  setAccessToken(null);
  setSessionCookie(false);
}

/**
 * Fetch authentifié : attache le Bearer. Sur 401, tente un refresh unique puis
 * rejoue la requête (rotation transparente de l'access token expiré).
 */
async function authedFetch<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "network");
  }

  if (res.status === 401 && retry && (await refresh())) {
    return authedFetch<T>(path, init, false);
  }
  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Variante de {@link authedFetch} renvoyant la réponse brute (sans parse JSON),
 * pour les téléchargements de fichiers (CSV). Gère le refresh 401 à l'identique.
 */
async function authedFetchRaw(path: string, init?: RequestInit, retry = true): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "network");
  }

  if (res.status === 401 && retry && (await refresh())) {
    return authedFetchRaw(path, init, false);
  }
  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
  return res;
}

/** Filtres/pagination de la liste RDV (back-office). */
export interface RendezVousQuery {
  page?: number;
  pageSize?: number;
  statut?: StatutRendezVous;
  typeClient?: string;
  prestationId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function buildQuery(query: RendezVousQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Liste paginée des RDV (filtres + recherche). */
export function listRendezVous(query: RendezVousQuery): Promise<Paginated<RendezVousDetail>> {
  return authedFetch<Paginated<RendezVousDetail>>(`/rendez-vous${buildQuery(query)}`);
}

/** Détail d'un RDV. */
export function getRendezVous(id: string): Promise<RendezVousDetail> {
  return authedFetch<RendezVousDetail>(`/rendez-vous/${id}`);
}

/** Catalogue des prestations (actives + inactives), pour le filtre et l'admin. */
export function listPrestations(): Promise<Prestation[]> {
  return authedFetch<Prestation[]>(`/prestations`);
}

// --- Prestations (CRUD admin) ---

/** Charge utile de création/édition d'une prestation. */
export interface PrestationPayload {
  libelle: I18nText;
  description?: I18nText | null;
  cible: TypeClient;
  dureeMinutes: number;
  actif?: boolean;
}

/** Crée une prestation. */
export function createPrestation(payload: PrestationPayload): Promise<Prestation> {
  return authedFetch<Prestation>(`/prestations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Met à jour une prestation (champs partiels). */
export function updatePrestation(
  id: string,
  payload: Partial<PrestationPayload>,
): Promise<Prestation> {
  return authedFetch<Prestation>(`/prestations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Désactive une prestation (soft-delete). */
export function disablePrestation(id: string): Promise<Prestation> {
  return authedFetch<Prestation>(`/prestations/${id}`, { method: "DELETE" });
}

// --- Intervenants & équipes (CRUD admin) ---

/** Liste des intervenants (option : seulement actifs). */
export function listIntervenants(actif?: boolean): Promise<Intervenant[]> {
  const qs = actif === undefined ? "" : `?actif=${actif}`;
  return authedFetch<Intervenant[]>(`/intervenants${qs}`);
}

/** Charge utile de création/édition d'un intervenant. */
export interface IntervenantPayload {
  nom: string;
  prenom?: string | null;
  equipeId?: string | null;
  actif?: boolean;
}

/** Crée un intervenant. */
export function createIntervenant(payload: IntervenantPayload): Promise<Intervenant> {
  return authedFetch<Intervenant>(`/intervenants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Met à jour un intervenant (champs partiels). */
export function updateIntervenant(
  id: string,
  payload: Partial<IntervenantPayload>,
): Promise<Intervenant> {
  return authedFetch<Intervenant>(`/intervenants/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Désactive un intervenant (soft-delete : plus assignable). */
export function disableIntervenant(id: string): Promise<Intervenant> {
  return authedFetch<Intervenant>(`/intervenants/${id}`, { method: "DELETE" });
}

/** Liste des équipes. */
export function listEquipes(): Promise<Equipe[]> {
  return authedFetch<Equipe[]>(`/equipes`);
}

/** Crée une équipe. */
export function createEquipe(nom: string): Promise<Equipe> {
  return authedFetch<Equipe>(`/equipes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom }),
  });
}

/** Renomme une équipe. */
export function updateEquipe(id: string, nom: string): Promise<Equipe> {
  return authedFetch<Equipe>(`/equipes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom }),
  });
}

/** Supprime une équipe (les intervenants rattachés sont détachés). */
export async function deleteEquipe(id: string): Promise<void> {
  await authedFetchRaw(`/equipes/${id}`, { method: "DELETE" });
}

/** (Ré)attribue ou détache un intervenant sur un RDV. */
export function assignIntervenant(
  rdvId: string,
  intervenantId: string | null,
): Promise<RendezVousDetail> {
  return authedFetch<RendezVousDetail>(`/rendez-vous/${rdvId}/intervenant`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intervenantId }),
  });
}

// --- Exports (CSV) & abonnements iCal ---

/**
 * Télécharge l'export CSV des RDV en respectant les filtres courants.
 * Déclenche le téléchargement navigateur via une URL blob éphémère.
 */
export async function downloadRendezVousCsv(query: RendezVousQuery): Promise<void> {
  const { page: _page, pageSize: _pageSize, ...filters } = query;
  void _page;
  void _pageSize;
  const res = await authedFetchRaw(`/rendez-vous/export.csv${buildQuery(filters)}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = "rendez-vous.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Base absolue de l'API, pour composer l'URL publique d'abonnement iCal. */
export function apiBaseUrl(): string {
  if (API_BASE.startsWith("http")) return API_BASE;
  if (typeof window !== "undefined") return `${window.location.origin}${API_BASE}`;
  return API_BASE;
}

/** URL publique d'abonnement iCal pour un token donné. */
export function calendarFeedUrl(token: string): string {
  return `${apiBaseUrl()}/calendar-feeds/${token}.ics`;
}

/** Liste des tokens d'abonnement iCal (actifs et révoqués). */
export function listCalendarFeeds(): Promise<CalendarFeedToken[]> {
  return authedFetch<CalendarFeedToken[]>(`/calendar-feeds`);
}

/** Crée un token d'abonnement iCal (le secret n'est renvoyé qu'ici). */
export function createCalendarFeed(label: string): Promise<CalendarFeedToken> {
  return authedFetch<CalendarFeedToken>(`/calendar-feeds`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
}

/** Révoque un token d'abonnement iCal (l'URL associée cesse de fonctionner). */
export async function revokeCalendarFeed(id: string): Promise<void> {
  await authedFetchRaw(`/calendar-feeds/${id}`, { method: "DELETE" });
}

// --- Actions sur un RDV : statut & replanification (#36) ---

/** Change le statut d'un RDV (transition contrôlée côté API → email client). */
export function changeStatut(id: string, statut: StatutRendezVous): Promise<RendezVousDetail> {
  return authedFetch<RendezVousDetail>(`/rendez-vous/${id}/statut`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
}

/** Replanifie un RDV sur un nouveau créneau (instant ISO) → statut REPLANIFIE + email. */
export function rescheduleRendezVous(id: string, debut: string): Promise<RendezVousDetail> {
  return authedFetch<RendezVousDetail>(`/rendez-vous/${id}/replanification`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ debut }),
  });
}

// --- Clients (#37) ---

/** Pagination/recherche de la liste clients. */
export interface ClientsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

/** Liste paginée des clients (recherche nom/prénom/email). */
export function listClients(query: ClientsQuery): Promise<Paginated<Client>> {
  return authedFetch<Paginated<Client>>(`/clients${buildQuery(query)}`);
}

/** Fiche client enrichie de l'historique de ses RDV. */
export function getClientHistorique(id: string): Promise<ClientAvecHistorique> {
  return authedFetch<ClientAvecHistorique>(`/clients/${id}/rendez-vous`);
}

/** RGPD : anonymise les PII du client (conserve l'historique). */
export function anonymizeClient(id: string): Promise<Client> {
  return authedFetch<Client>(`/clients/${id}/anonymisation`, { method: "POST" });
}

/** RGPD : suppression définitive du client (cascade sur ses RDV). */
export async function deleteClient(id: string): Promise<void> {
  await authedFetchRaw(`/clients/${id}`, { method: "DELETE" });
}

// --- Disponibilités (#38) ---

/** Charge utile d'une règle hebdomadaire (heures "HH:mm", jour 0=dim…6=sam). */
export interface RegleInput {
  jour: number;
  debut: string;
  fin: string;
}

/** Charge utile d'une exception/blocage (plage ISO + motif optionnel). */
export interface ExceptionInput {
  debut: string;
  fin: string;
  bloque?: boolean;
  motif?: string;
}

/** Règles hebdomadaires d'ouverture. */
export function listRegles(): Promise<RegleHebdomadaire[]> {
  return authedFetch<RegleHebdomadaire[]>(`/disponibilites/regles`);
}

/** Crée une règle d'ouverture. */
export function createRegle(input: RegleInput): Promise<RegleHebdomadaire> {
  return authedFetch<RegleHebdomadaire>(`/disponibilites/regles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Supprime une règle d'ouverture. */
export async function deleteRegle(id: string): Promise<void> {
  await authedFetchRaw(`/disponibilites/regles/${id}`, { method: "DELETE" });
}

/** Exceptions / blocages de disponibilité. */
export function listExceptions(): Promise<ExceptionDisponibilite[]> {
  return authedFetch<ExceptionDisponibilite[]>(`/disponibilites/exceptions`);
}

/** Crée une exception/blocage. */
export function createException(input: ExceptionInput): Promise<ExceptionDisponibilite> {
  return authedFetch<ExceptionDisponibilite>(`/disponibilites/exceptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Supprime une exception/blocage. */
export async function deleteException(id: string): Promise<void> {
  await authedFetchRaw(`/disponibilites/exceptions/${id}`, { method: "DELETE" });
}
