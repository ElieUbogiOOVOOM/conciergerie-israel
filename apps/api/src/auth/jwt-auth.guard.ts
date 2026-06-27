import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

import { type AccessTokenPayload, type AuthenticatedAdmin, AuthService } from "./auth.service";

/** Requête enrichie de l'admin authentifié. */
export interface AuthenticatedRequest extends Request {
  admin: AuthenticatedAdmin;
}

/** Format UUID (v1-v5) attendu pour le claim `sub`. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Protège les routes back-office : exige un access token `Bearer` valide,
 * puis attache l'admin (`req.admin`).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException("Token d'accès manquant.");
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Token d'accès invalide ou expiré.");
    }

    // Validation défensive du claim : `sub` doit être un UUID avant toute requête.
    if (typeof payload?.sub !== "string" || !UUID_RE.test(payload.sub)) {
      throw new UnauthorizedException("Token d'accès invalide.");
    }

    const admin = await this.auth.findAdminById(payload.sub);
    if (!admin) {
      throw new UnauthorizedException("Compte introuvable.");
    }

    request.admin = admin;
    return true;
  }

  private extractBearer(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, value] = header.split(" ");
    return scheme === "Bearer" && value ? value : null;
  }
}
