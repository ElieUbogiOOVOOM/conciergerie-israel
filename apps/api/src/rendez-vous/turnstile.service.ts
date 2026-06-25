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

  /** true si le challenge est validé (ou si la vérification est désactivée). */
  async verify(token: string | undefined, ip?: string): Promise<boolean> {
    const secret = this.config.get("TURNSTILE_SECRET", { infer: true });
    if (!secret) {
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
      const res = await fetch(url, { method: "POST", body });
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch (error) {
      this.logger.error("Échec de la vérification Turnstile", error as Error);
      return false;
    }
  }
}
