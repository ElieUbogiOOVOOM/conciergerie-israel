import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../config/env.validation";

/**
 * Vérification Cloudflare Turnstile.
 * Désactivée (toujours valide) tant que `TURNSTILE_SECRET` n'est pas configuré,
 * pour permettre dev/staging sans clé (issue #13).
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  /** true si le challenge est validé. Fail-closed en production si non configuré/erreur. */
  async verify(token: string | undefined, ip?: string): Promise<boolean> {
    const secret = this.config.get("TURNSTILE_SECRET", { infer: true });
    if (!secret) {
      // Hors production : vérification désactivée (dev/staging sans clé).
      // En production, l'env interdit déjà un secret absent (cf. env.validation) — fail-closed.
      const isProd = this.config.get("NODE_ENV", { infer: true }) === "production";
      if (isProd) {
        this.logger.error("TURNSTILE_SECRET absent en production : requête rejetée (fail-closed).");
        return false;
      }
      return true;
    }
    if (!token) {
      return false;
    }

    const body = new URLSearchParams({ secret, response: token });
    if (ip) {
      body.append("remoteip", ip);
    }

    try {
      const url = this.config.get("TURNSTILE_VERIFY_URL", { infer: true });
      // Timeout pour ne pas bloquer l'endpoint public si Cloudflare est lent (fail-closed).
      const res = await fetch(url, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(5000),
      });
      const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
      if (data.success !== true) {
        this.logger.warn(
          `Turnstile rejeté : ${(data["error-codes"] ?? []).join(", ") || "inconnu"}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error("Échec de la vérification Turnstile (timeout/réseau)", error as Error);
      return false;
    }
  }
}
