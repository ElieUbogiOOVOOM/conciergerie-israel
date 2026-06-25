import type { AvailableSlots, Locale, Prestation, RendezVous, TypeClient } from "@hymea/shared";

/**
 * Client HTTP de l'API HYMEA, consommé côté navigateur par le funnel RDV (#28).
 * La base est configurable par environnement (NEXT_PUBLIC_API_URL) pour pointer
 * indifféremment vers le local, la préprod ou la prod. Repli sur la prod livrée.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://hymea.elie-ubogi.fr/api").replace(
  /\/$/,
  "",
);

/** Erreur d'API porteuse du statut HTTP, pour différencier les cas (429, 400…). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // Réseau injoignable (CORS, offline, DNS) : message générique côté UI.
    throw new ApiError(0, "network");
  }

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

/** Prestations actives proposées pour un type de client donné. */
export function fetchPrestations(cible: TypeClient): Promise<Prestation[]> {
  return request<Prestation[]>(`/prestations/public?cible=${cible}`);
}

/**
 * Créneaux réellement libres pour une date (YYYY-MM-DD) et une prestation
 * (sa durée détermine le pas). Instants renvoyés en UTC.
 */
export function fetchSlots(date: string, prestationId: string): Promise<AvailableSlots> {
  return request<AvailableSlots>(
    `/slots?date=${date}&prestationId=${encodeURIComponent(prestationId)}`,
  );
}

/** Payload de création d'une demande publique de RDV (cf. CreateRendezVousDto API). */
export type CreateRendezVousPayload = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  typeClient: TypeClient;
  prestationId: string;
  /** Créneau ISO 8601 UTC — obligatoire pour un particulier. */
  debut?: string;
  /** Adresse — obligatoire pour un particulier. */
  adresse?: string;
  message?: string;
  surfaceM2?: number;
  nombrePieces?: number;
  locale: Locale;
  /** Consentement RGPD : doit valoir true. */
  consentement: boolean;
  /** Jeton Cloudflare Turnstile (vide si désactivé). */
  turnstileToken?: string;
  /** Honeypot anti-bot : doit rester vide. */
  website?: string;
};

/** Crée la demande de RDV (statut NOUVEAU). */
export function createRendezVous(payload: CreateRendezVousPayload): Promise<RendezVous> {
  return request<RendezVous>("/rendez-vous", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
