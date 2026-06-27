import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import type { Env } from "../config/env.validation";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get("JWT_ACCESS_SECRET", { infer: true }),
        // Algorithme verrouillé (anti algorithm-confusion) + claims iss/aud vérifiés au guard.
        signOptions: {
          expiresIn: config.get("JWT_ACCESS_TTL", { infer: true }),
          algorithm: "HS256",
          issuer: "hymea-api",
          audience: "hymea-admin",
        },
        verifyOptions: {
          algorithms: ["HS256"],
          issuer: "hymea-api",
          audience: "hymea-admin",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  // Exporté pour que les modules admin (prestations, disponibilités) appliquent le guard.
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
