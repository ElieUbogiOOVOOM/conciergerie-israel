import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EmailType, Locale } from "@hymea/shared";
import { Resend } from "resend";

import type { Env } from "../config/env.validation";
import { type MailContent, renderHymeaNotification, renderRdvEmail } from "./templates";

/** Email effectivement adressé (ou tenté) — conservé hors production pour tests/debug. */
export interface SentEmail {
  to: string;
  subject: string;
  type: EmailType;
  /** Destinataire client ou notification interne HYMEA. */
  audience: "client" | "hymea";
  locale: Locale;
  html: string;
  text: string;
}

/** Payload normalisé d'un événement de cycle de vie d'un RDV. */
export interface RdvLifecyclePayload {
  type: EmailType;
  clientNom: string;
  clientPrenom: string;
  clientEmail: string;
  clientTelephone: string;
  typeClient: string;
  locale: Locale;
  /** Libellé de prestation déjà localisé. */
  prestationLibelle: string;
  /** Début du créneau (ISO) ou null. */
  debutIso: string | null;
  adresse: string | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly enabled: boolean;

  /**
   * Boîte d'envoi en mémoire (hors production) : permet d'inspecter les emails
   * déclenchés dans les tests e2e sans dépendre d'un vrai envoi Resend.
   */
  readonly outbox: SentEmail[] = [];

  constructor(private readonly config: ConfigService<Env, true>) {
    const apiKey = this.config.get("RESEND_API_KEY", { infer: true });
    const isTest = this.config.get("NODE_ENV", { infer: true }) === "test";
    // En test : jamais d'envoi réel (la boîte d'envoi suffit aux assertions).
    this.enabled = Boolean(apiKey) && !isTest;
    this.resend = apiKey && !isTest ? new Resend(apiKey) : null;
  }

  /** Déclenche les emails liés à une étape du cycle de vie (client + notif HYMEA). */
  async sendRdvLifecycle(payload: RdvLifecyclePayload): Promise<void> {
    const creneau = this.formatCreneau(payload.debutIso, payload.locale);
    const siteUrl = this.config.get("PUBLIC_SITE_URL", { infer: true });

    const clientMail = renderRdvEmail(payload.type, {
      prenom: payload.clientPrenom,
      prestationLibelle: payload.prestationLibelle,
      creneau,
      adresse: payload.adresse,
      locale: payload.locale,
      siteUrl,
    });
    await this.dispatch(payload.clientEmail, clientMail, payload.type, "client", payload.locale);

    const hymeaMail = renderHymeaNotification({
      type: payload.type,
      clientNom: payload.clientNom,
      clientPrenom: payload.clientPrenom,
      clientEmail: payload.clientEmail,
      clientTelephone: payload.clientTelephone,
      typeClient: payload.typeClient,
      prestationLibelle: payload.prestationLibelle,
      creneau,
      adresse: payload.adresse,
      adminUrl: `${siteUrl}/admin`,
    });
    const hymeaTo = this.config.get("HYMEA_NOTIFICATION_EMAIL", { infer: true });
    await this.dispatch(hymeaTo, hymeaMail, payload.type, "hymea", "fr");
  }

  /**
   * Rappel avant un RDV (issue #17) : email « rappel » vers le client uniquement,
   * sans notification interne HYMEA (le rappel ne concerne pas l'équipe).
   */
  async sendReminder(payload: RdvLifecyclePayload): Promise<void> {
    const creneau = this.formatCreneau(payload.debutIso, payload.locale);
    const siteUrl = this.config.get("PUBLIC_SITE_URL", { infer: true });

    const clientMail = renderRdvEmail("rappel", {
      prenom: payload.clientPrenom,
      prestationLibelle: payload.prestationLibelle,
      creneau,
      adresse: payload.adresse,
      locale: payload.locale,
      siteUrl,
    });
    await this.dispatch(payload.clientEmail, clientMail, "rappel", "client", payload.locale);
  }

  /** Formate un instant ISO dans le fuseau métier et la langue du client. */
  private formatCreneau(iso: string | null, locale: Locale): string | null {
    if (!iso) {
      return null;
    }
    const tz = this.config.get("BUSINESS_TZ", { infer: true });
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: tz,
    }).format(new Date(iso));
  }

  /**
   * Envoie un email via Resend si configuré ; sinon journalise (no-op).
   * Un échec d'envoi est journalisé mais ne remonte jamais (ne casse pas le flux RDV).
   */
  private async dispatch(
    to: string,
    content: MailContent,
    type: EmailType,
    audience: "client" | "hymea",
    locale: Locale,
  ): Promise<void> {
    const isProd = this.config.get("NODE_ENV", { infer: true }) === "production";
    if (!isProd) {
      this.outbox.push({
        to,
        type,
        audience,
        locale,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
    }

    if (!this.enabled || !this.resend) {
      this.logger.log(`[mail:no-op] → ${to} « ${content.subject} » (${type}/${audience})`);
      return;
    }

    try {
      const from = this.config.get("MAIL_FROM", { infer: true });
      await this.resend.emails.send({
        from,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
    } catch (error) {
      this.logger.error(`Échec d'envoi email → ${to} (${type})`, error as Error);
    }
  }
}
