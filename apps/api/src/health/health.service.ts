import { Inject, Injectable } from "@nestjs/common";
import { sql } from "kysely";

import { KYSELY, type KyselyDB } from "../database/database.module";

export interface HealthStatus {
  status: "ok";
  db: "up" | "down";
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(@Inject(KYSELY) private readonly db: KyselyDB) {}

  async check(): Promise<HealthStatus> {
    let db: "up" | "down" = "down";
    try {
      await sql`select 1`.execute(this.db);
      db = "up";
    } catch {
      db = "down";
    }
    return { status: "ok", db, timestamp: new Date().toISOString() };
  }
}
