import { Body, Controller, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { CookieOptions, Request, Response } from "express";

import type { Env } from "../config/env.validation";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

/** Nom du cookie httpOnly portant le refresh token. */
export const REFRESH_COOKIE = "hymea_refresh";
/** Le cookie n'est renvoyé que sur les routes d'auth (login/refresh/logout). */
const REFRESH_COOKIE_PATH = "/api/auth";

// Anti-brute-force login/refresh (pilotable par env, lu à l'import — comme en test).
const AUTH_THROTTLE_LIMIT = Number(process.env.AUTH_THROTTLE_LIMIT ?? 10);
const AUTH_THROTTLE_TTL_MS = Number(process.env.AUTH_THROTTLE_TTL ?? 900) * 1000;
const AUTH_THROTTLE = { default: { limit: AUTH_THROTTLE_LIMIT, ttl: AUTH_THROTTLE_TTL_MS } };

interface AccessTokenResponse {
  accessToken: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post("login")
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @ApiOkResponse({ description: "Access token + dépose le cookie refresh httpOnly." })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    const tokens = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
    return { accessToken: tokens.accessToken };
  }

  @Post("refresh")
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @ApiOkResponse({ description: "Rotation : nouvel access token + nouveau cookie refresh." })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    const raw = this.readRefreshCookie(req);
    const tokens = await this.auth.refresh(raw ?? "");
    this.setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
    return { accessToken: tokens.accessToken };
  }

  @Post("logout")
  @HttpCode(204)
  @ApiOkResponse({ description: "Révoque le refresh token et efface le cookie." })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  private readRefreshCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  }

  private setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
    const options: CookieOptions = {
      httpOnly: true,
      // Strict : le cookie n'est servi qu'aux routes /api/auth, aucune navigation cross-site légitime.
      sameSite: "strict",
      secure: this.config.get("COOKIE_SECURE", { infer: true }),
      path: REFRESH_COOKIE_PATH,
      expires: expiresAt,
    };
    res.cookie(REFRESH_COOKIE, token, options);
  }
}
