import { Global, Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { Env } from "../config/env.validation";
import type { Database } from "./database.types";

/** Jeton d'injection de l'instance Kysely. */
export const KYSELY = "KYSELY_DB";

/** Type d'injection à utiliser dans les services : `@Inject(KYSELY) db: KyselyDB`. */
export type KyselyDB = Kysely<Database>;

@Global()
@Module({
  providers: [
    {
      provide: KYSELY,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): KyselyDB => {
        const pool = new Pool({
          connectionString: config.getOrThrow("DATABASE_URL", { infer: true }),
        });
        return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
      },
    },
  ],
  exports: [KYSELY],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(KYSELY) private readonly db: KyselyDB) {}

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
  }
}
