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
