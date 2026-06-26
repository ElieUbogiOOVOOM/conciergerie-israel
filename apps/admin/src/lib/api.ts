import type {
  Client,
  ClientAvecHistorique,
  Equipe,
  ExceptionDisponibilite,
  Intervenant,
  Paginated,
  Prestation,
  RegleHebdomadaire,
  RendezVousDetail,
  StatutRendezVous,
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
  document.cookie = present
    ? `${SESSION_COOKIE}=1; path=/admin; max-age=2592000; samesite=lax`
    : `${SESSION_COOKIE}=; path=/admin; max-age=0; samesite=lax`;
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

/** Variante pour les réponses sans corps (DELETE → 204) : même rotation 401. */
async function authedVoid(path: string, init?: RequestInit, retry = true): Promise<void> {
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
    return authedVoid(path, init, false);
  }
  if (!res.ok) {
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
}

/** En-têtes JSON communs aux mutations PATCH/POST. */
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

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

function buildQuery(query: Record<string, unknown>): string {
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
  return authedFetch<Paginated<RendezVousDetail>>(
    `/rendez-vous${buildQuery(query as Record<string, unknown>)}`,
  );
}

/** Détail d'un RDV. */
export function getRendezVous(id: string): Promise<RendezVousDetail> {
  return authedFetch<RendezVousDetail>(`/rendez-vous/${id}`);
}

/** Catalogue des prestations (pour le filtre par prestation). */
export function listPrestations(): Promise<Prestation[]> {
  return authedFetch<Prestation[]>(`/prestations`);
}

// ─────────────────────── Actions sur un RDV (#36) ───────────────────────────

/** Change le statut d'un RDV (transition contrôlée côté API → email client). */
export function changeStatut(id: string, statut: StatutRendezVous): Promise<RendezVousDetail> {
  return authedFetch<RendezVousDetail>(`/rendez-vous/${id}/statut`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ statut }),
  });
}

/** Attribue (ou retire, via null) un intervenant à un RDV. */
export function assignIntervenant(
  id: string,
  intervenantId: string | null,
): Promise<RendezVousDetail> {
  return authedFetch<RendezVousDetail>(`/rendez-vous/${id}/intervenant`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ intervenantId }),
  });
}

/** Replanifie un RDV sur un nouveau créneau (instant ISO) → statut REPLANIFIE + email. */
export function rescheduleRendezVous(id: string, debut: string): Promise<RendezVousDetail> {
  return authedFetch<RendezVousDetail>(`/rendez-vous/${id}/replanification`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ debut }),
  });
}

/** Intervenants actifs (sélecteur d'attribution). */
export function listIntervenants(): Promise<Intervenant[]> {
  return authedFetch<Intervenant[]>(`/intervenants`);
}

/** Équipes (regroupement des intervenants). */
export function listEquipes(): Promise<Equipe[]> {
  return authedFetch<Equipe[]>(`/intervenants/equipes`);
}

// ─────────────────────────── Clients (#37) ──────────────────────────────────

/** Pagination/recherche de la liste clients. */
export interface ClientsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

/** Liste paginée des clients (recherche nom/prénom/email). */
export function listClients(query: ClientsQuery): Promise<Paginated<Client>> {
  return authedFetch<Paginated<Client>>(`/clients${buildQuery(query as Record<string, unknown>)}`);
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
export function deleteClient(id: string): Promise<void> {
  return authedVoid(`/clients/${id}`, { method: "DELETE" });
}

// ─────────────────────── Disponibilités (#38) ───────────────────────────────

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
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/** Supprime une règle d'ouverture. */
export function deleteRegle(id: string): Promise<void> {
  return authedVoid(`/disponibilites/regles/${id}`, { method: "DELETE" });
}

/** Exceptions / blocages de disponibilité. */
export function listExceptions(): Promise<ExceptionDisponibilite[]> {
  return authedFetch<ExceptionDisponibilite[]>(`/disponibilites/exceptions`);
}

/** Crée une exception/blocage. */
export function createException(input: ExceptionInput): Promise<ExceptionDisponibilite> {
  return authedFetch<ExceptionDisponibilite>(`/disponibilites/exceptions`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

/** Supprime une exception/blocage. */
export function deleteException(id: string): Promise<void> {
  return authedVoid(`/disponibilites/exceptions/${id}`, { method: "DELETE" });
}
