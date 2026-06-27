import { randomBytes } from "node:crypto";

import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";

import type { Env } from "../config/env.validation";
import { KYSELY, type KyselyDB } from "../database/database.module";

/** Charge utile signée dans l'access token. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
}

/** Admin authentifié attaché à la requête par le guard. */
export interface AuthenticatedAdmin {
  id: string;
  email: string;
}

/** Résultat d'un login / refresh : access token + refresh token brut à poser en cookie. */
export interface AuthTokens {
  accessToken: string;
  /** Token brut (non hashé) — ne transite que vers le cookie httpOnly du client. */
  refreshToken: string;
  /** Expiration du refresh token (pour la durée du cookie). */
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(KYSELY) private readonly db: KyselyDB,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Hash argon2 factice pour égaliser le temps de réponse quand l'email n'existe pas. */
  private dummyHash: Promise<string> | null = null;

  /** Vérifie les identifiants (argon2) puis émet un couple access + refresh. */
  async login(email: string, password: string): Promise<AuthTokens> {
    const admin = await this.db
      .selectFrom("admins")
      .select(["id", "email", "password_hash"])
      .where("email", "=", email.toLowerCase())
      .executeTakeFirst();

    // Anti-énumération par timing : si l'admin n'existe pas, on vérifie tout de même
    // contre un hash factice pour que le coût argon2 soit identique dans les deux cas.
    if (!admin) {
      this.dummyHash ??= argon2.hash(randomBytes(16).toString("hex"));
      await this.safeVerify(await this.dummyHash, password);
      throw new UnauthorizedException("Identifiants invalides.");
    }
    if (!(await this.safeVerify(admin.password_hash, password))) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    return this.issueTokens(admin.id, admin.email);
  }

  /**
   * Rotation : valide le refresh token brut, révoque l'ancien et émet un nouveau couple.
   * Un token inconnu, révoqué ou expiré est rejeté (401).
   */
  async refresh(rawToken: string): Promise<AuthTokens> {
    const record = await this.findValidRefreshToken(rawToken);
    if (!record) {
      throw new UnauthorizedException("Refresh token invalide.");
    }

    await this.db
      .updateTable("refresh_tokens")
      .set({ revoked_at: new Date() })
      .where("id", "=", record.id)
      .execute();

    const admin = await this.db
      .selectFrom("admins")
      .select(["id", "email"])
      .where("id", "=", record.admin_id)
      .executeTakeFirst();

    if (!admin) {
      throw new UnauthorizedException("Compte introuvable.");
    }

    return this.issueTokens(admin.id, admin.email);
  }

  /** Révoque le refresh token courant (logout). Silencieux si le token est inconnu. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    const record = await this.findValidRefreshToken(rawToken);
    if (record) {
      await this.db
        .updateTable("refresh_tokens")
        .set({ revoked_at: new Date() })
        .where("id", "=", record.id)
        .execute();
    }
  }

  /** Recharge l'admin depuis un access token validé (utilisé par le guard). */
  async findAdminById(id: string): Promise<AuthenticatedAdmin | null> {
    const admin = await this.db
      .selectFrom("admins")
      .select(["id", "email"])
      .where("id", "=", id)
      .executeTakeFirst();
    return admin ?? null;
  }

  /**
   * Émet un access JWT + crée et persiste (hashé) un nouveau refresh token.
   * Le token brut a la forme `<selector>.<secret>` : `selector` est indexé (lookup O(1)),
   * seul `secret` est hashé en base (comparaison à temps constant, un seul argon2 par refresh).
   */
  private async issueTokens(adminId: string, email: string): Promise<AuthTokens> {
    const payload: AccessTokenPayload = { sub: adminId, email };
    const accessToken = await this.jwt.signAsync(payload);

    const selector = randomBytes(16).toString("base64url");
    const secret = randomBytes(32).toString("base64url");
    const rawToken = `${selector}.${secret}`;
    const tokenHash = await argon2.hash(secret);
    const ttlDays = this.config.get("JWT_REFRESH_TTL_DAYS", { infer: true });
    const refreshExpiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.db
      .insertInto("refresh_tokens")
      .values({ admin_id: adminId, selector, token_hash: tokenHash, expires_at: refreshExpiresAt })
      .execute();

    return { accessToken, refreshToken: rawToken, refreshExpiresAt };
  }

  /**
   * Retrouve l'enregistrement correspondant au refresh token brut via le `selector` indexé.
   * Détection de réutilisation (RFC 6819) : si un token déjà révoqué mais au secret valide
   * est présenté (vol probable), toute la famille de l'admin est révoquée.
   */
  private async findValidRefreshToken(
    rawToken: string,
  ): Promise<{ id: string; admin_id: string } | null> {
    const dot = rawToken.indexOf(".");
    if (dot <= 0) {
      return null;
    }
    const selector = rawToken.slice(0, dot);
    const secret = rawToken.slice(dot + 1);

    const row = await this.db
      .selectFrom("refresh_tokens")
      .select(["id", "admin_id", "token_hash", "revoked_at", "expires_at"])
      .where("selector", "=", selector)
      .executeTakeFirst();

    if (!row || !(await this.safeVerify(row.token_hash, secret))) {
      return null;
    }
    if (row.revoked_at) {
      // Réutilisation d'un token révoqué : invalider toute la lignée de l'admin.
      await this.revokeAllForAdmin(row.admin_id);
      return null;
    }
    if (row.expires_at <= new Date()) {
      return null;
    }
    return { id: row.id, admin_id: row.admin_id };
  }

  /** Révoque tous les refresh tokens actifs d'un admin (détection de réutilisation / logout global). */
  private async revokeAllForAdmin(adminId: string): Promise<void> {
    await this.db
      .updateTable("refresh_tokens")
      .set({ revoked_at: new Date() })
      .where("admin_id", "=", adminId)
      .where("revoked_at", "is", null)
      .execute();
  }

  /** argon2.verify qui renvoie false (au lieu de throw) sur un hash corrompu. */
  private async safeVerify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
