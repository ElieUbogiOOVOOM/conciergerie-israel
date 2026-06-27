import { createHash, randomBytes } from "node:crypto";

import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CalendarFeedToken } from "@hymea/shared";

import { KYSELY, type KyselyDB } from "../database/database.module";

/** Statuts inclus dans le flux iCal (RDV fermes). */
const ICS_STATUTS = ["CONFIRME", "REPLANIFIE"] as const;

/** Hash SHA-256 (hex) d'un jeton porteur à haute entropie (argon2 inutile ici). */
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Flux iCal lecture seule protégé par jeton (issue #20).
 *
 * Le back-office génère/révoque des jetons nommés ; un endpoint public sert un
 * `.ics` (RFC 5545) listant les RDV confirmés/replanifiés. Sans jeton valide → 403.
 */
@Injectable()
export class CalendarService {
  constructor(@Inject(KYSELY) private readonly db: KyselyDB) {}

  /**
   * Crée un jeton d'abonnement (back-office). Le jeton brut n'est renvoyé qu'ICI,
   * une seule fois (seul son hash est persisté) ; il devra être copié immédiatement.
   */
  async createToken(label: string): Promise<CalendarFeedToken> {
    const rawToken = randomBytes(32).toString("base64url");
    const row = await this.db
      .insertInto("calendar_feed_tokens")
      .values({ label, token_hash: hashToken(rawToken) })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toCalendarFeedToken(row, rawToken);
  }

  /** Liste les jetons (les plus récents d'abord). Le jeton brut n'est jamais renvoyé (hashé). */
  async listTokens(): Promise<CalendarFeedToken[]> {
    const rows = await this.db
      .selectFrom("calendar_feed_tokens")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
    return rows.map((row) => toCalendarFeedToken(row, null));
  }

  /** Révoque un jeton (404 si absent). */
  async revokeToken(id: string): Promise<void> {
    const updated = await this.db
      .updateTable("calendar_feed_tokens")
      .set({ revoked_at: new Date() })
      .where("id", "=", id)
      .where("revoked_at", "is", null)
      .returning("id")
      .executeTakeFirst();
    if (!updated) {
      // Soit l'id n'existe pas, soit déjà révoqué : 404 dans les deux cas.
      const exists = await this.db
        .selectFrom("calendar_feed_tokens")
        .select("id")
        .where("id", "=", id)
        .executeTakeFirst();
      if (!exists) {
        throw new NotFoundException("Jeton introuvable.");
      }
    }
  }

  /** Construit le `.ics` pour un jeton (403 si absent/révoqué/expiré). */
  async buildIcs(token: string): Promise<string> {
    const found = await this.db
      .selectFrom("calendar_feed_tokens")
      .select(["id", "revoked_at", "expires_at"])
      .where("token_hash", "=", hashToken(token))
      .executeTakeFirst();
    if (!found || found.revoked_at || (found.expires_at && found.expires_at <= new Date())) {
      throw new ForbiddenException("Jeton invalide, révoqué ou expiré.");
    }

    const rows = await this.db
      .selectFrom("rendez_vous")
      .innerJoin("clients", "clients.id", "rendez_vous.client_id")
      .innerJoin("prestations", "prestations.id", "rendez_vous.prestation_id")
      .where("rendez_vous.statut", "in", [...ICS_STATUTS])
      .where("rendez_vous.debut", "is not", null)
      .where("rendez_vous.fin", "is not", null)
      .orderBy("rendez_vous.debut", "asc")
      .select([
        "rendez_vous.id as id",
        "rendez_vous.debut as debut",
        "rendez_vous.fin as fin",
        "rendez_vous.adresse as adresse",
        "rendez_vous.updated_at as updated_at",
        "clients.nom as client_nom",
        "clients.prenom as client_prenom",
        "prestations.libelle as prestation_libelle",
      ])
      .execute();

    const stamp = formatIcsDate(new Date());
    const events = rows.map((row) => {
      const libelle = row.prestation_libelle as Record<string, string>;
      const presta = libelle.fr ?? Object.values(libelle)[0] ?? "Rendez-vous";
      const summary = `${presta} — ${row.client_prenom} ${row.client_nom}`.trim();
      const lines = [
        "BEGIN:VEVENT",
        `UID:${row.id}@hymea.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${formatIcsDate(row.debut as Date)}`,
        `DTEND:${formatIcsDate(row.fin as Date)}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        row.adresse ? `LOCATION:${escapeIcsText(row.adresse)}` : "",
        "STATUS:CONFIRMED",
        "END:VEVENT",
      ].filter(Boolean);
      return lines.map(foldIcsLine).join("\r\n");
    });

    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//HYMEA//Rendez-vous//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:HYMEA — Rendez-vous",
      ...events,
      "END:VCALENDAR",
    ];
    return `${calendar.join("\r\n")}\r\n`;
  }
}

function toCalendarFeedToken(
  row: {
    id: string;
    label: string;
    expires_at: Date | null;
    revoked_at: Date | null;
    created_at: Date;
  },
  /** Jeton brut : présent uniquement au moment de la création, sinon null (hashé en base). */
  rawToken: string | null,
): CalendarFeedToken {
  return {
    id: row.id,
    label: row.label,
    token: rawToken,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

/** Instant → date iCal UTC `YYYYMMDDTHHMMSSZ`. */
function formatIcsDate(date: Date): string {
  return `${date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")}`;
}

/** Échappe le texte iCal (RFC 5545 §3.3.11) : backslash, point-virgule, virgule, retours ligne. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/** Plie une ligne iCal à 75 octets (continuation par espace en tête, RFC 5545 §3.1). */
function foldIcsLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) {
    return line;
  }
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const charBytes = Buffer.byteLength(char, "utf8");
    // 74 pour la 1re ligne, 73 pour les suivantes (1 octet d'espace de continuation).
    const limit = chunks.length === 0 ? 75 : 74;
    if (currentBytes + charBytes > limit) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }
  if (current) {
    chunks.push(current);
  }
  return chunks.join("\r\n ");
}
