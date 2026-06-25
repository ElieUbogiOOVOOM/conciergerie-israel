/**
 * Contrats d'API partagés front ↔ back : enveloppes de réponse et d'erreur.
 */

/** Erreur API normalisée (alignée sur le filtre d'exception NestJS). */
export interface ApiError {
  /** Code machine stable (ex. "VALIDATION_ERROR", "NOT_FOUND"). */
  code: string;
  /** Message lisible (déjà localisé si pertinent). */
  message: string;
  /** Statut HTTP associé. */
  statusCode: number;
  /** Détails optionnels (erreurs de validation par champ, etc.). */
  details?: Record<string, unknown>;
}

/** Réponse paginée générique. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Réponse API : succès typé OU erreur. */
export type ApiResponse<T> = { data: T; error?: never } | { data?: never; error: ApiError };

export function isApiError<T>(res: ApiResponse<T>): res is { error: ApiError } {
  return "error" in res && res.error !== undefined;
}
