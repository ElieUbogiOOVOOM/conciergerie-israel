/**
 * Templates d'emails transactionnels HYMEA — HTML trilingue (FR/EN/HE).
 *
 * Contraintes :
 *  - HTML « email-safe » : layout en tables, styles inline, couleurs en hex.
 *  - Charte graphique HYMEA (CDC §07 / README) : fond charbon, accents or
 *    champagne, texte crème ; titres Cinzel, corps Cormorant Garamond, labels
 *    Jost (avec replis serif/sans génériques car les clients mail ne chargent
 *    pas toujours les polices distantes).
 *  - RTL complet pour l'hébreu (dir="rtl", alignements inversés).
 */
import type { EmailType, Locale } from "@hymea/shared";
import { dir } from "@hymea/shared";

/** Jetons de couleur de la charte (hex = source de vérité). */
const COLORS = {
  charbon: "#100e0b",
  charbonClair: "#1b1813",
  orChampagne: "#c2a36b",
  orProfond: "#a9854f",
  ivoire: "#f4efe4",
  creme: "#e9e1d2",
  cremeAttenue: "#b8ad99",
} as const;

const FONT_TITRE = "'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif";
const FONT_CORPS = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const FONT_LABEL = "'Jost', 'Helvetica Neue', Arial, sans-serif";

/** Contenu d'un email prêt à l'envoi. */
export interface MailContent {
  subject: string;
  html: string;
  /** Version texte brut (repli accessibilité / anti-spam). */
  text: string;
}

/** Variables métier injectées dans les templates RDV. */
export interface RdvEmailVars {
  prenom: string;
  /** Libellé de la prestation, déjà localisé. */
  prestationLibelle: string;
  /** Créneau formaté (déjà localisé + fuseau métier), ou null. */
  creneau: string | null;
  adresse: string | null;
  locale: Locale;
  /** URL publique de la vitrine (lien pied de page). */
  siteUrl: string;
}

/** Échappe le HTML pour neutraliser toute donnée utilisateur injectée. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Dictionnaire {
  subject: string;
  preheader: string;
  heading: string;
  intro: string;
  /** Mention de clôture (ex. « Nous reviendrons vers vous »). */
  outro: string;
  signature: string;
  labelPrestation: string;
  labelCreneau: string;
  labelAdresse: string;
  creneauAPreciser: string;
  footerNote: string;
}

/** Libellés par type d'email et par locale. */
const DICT: Record<EmailType, Record<Locale, Dictionnaire>> = {
  demande_recue: {
    fr: {
      subject: "Votre demande a bien été reçue — HYMEA",
      preheader: "Nous avons bien reçu votre demande de rendez-vous.",
      heading: "Demande reçue",
      intro:
        "Merci pour votre confiance. Votre demande a bien été enregistrée ; notre équipe vous recontacte rapidement pour la confirmer.",
      outro: "Aucune action n'est requise de votre part pour le moment.",
      signature: "L'équipe HYMEA",
      labelPrestation: "Prestation",
      labelCreneau: "Créneau souhaité",
      labelAdresse: "Adresse d'intervention",
      creneauAPreciser: "À préciser ensemble",
      footerNote: "Conciergerie & nettoyage premium — Israël",
    },
    en: {
      subject: "We've received your request — HYMEA",
      preheader: "Your appointment request has been received.",
      heading: "Request received",
      intro:
        "Thank you for your trust. Your request has been recorded; our team will contact you shortly to confirm it.",
      outro: "No action is required from you at this stage.",
      signature: "The HYMEA team",
      labelPrestation: "Service",
      labelCreneau: "Preferred slot",
      labelAdresse: "Service address",
      creneauAPreciser: "To be arranged together",
      footerNote: "Premium concierge & cleaning — Israel",
    },
    he: {
      subject: "קיבלנו את בקשתך — HYMEA",
      preheader: "בקשת הפגישה שלך התקבלה.",
      heading: "הבקשה התקבלה",
      intro: "תודה על האמון. בקשתך נרשמה; הצוות שלנו ייצור איתך קשר בקרוב כדי לאשר אותה.",
      outro: "בשלב זה לא נדרשת ממך כל פעולה.",
      signature: "צוות HYMEA",
      labelPrestation: "שירות",
      labelCreneau: "מועד מבוקש",
      labelAdresse: "כתובת השירות",
      creneauAPreciser: "ייקבע יחד",
      footerNote: "קונסיירז' וניקיון פרימיום — ישראל",
    },
  },
  confirmation: {
    fr: {
      subject: "Votre rendez-vous est confirmé — HYMEA",
      preheader: "Votre rendez-vous est confirmé.",
      heading: "Rendez-vous confirmé",
      intro: "Bonne nouvelle : votre rendez-vous est confirmé. Voici le récapitulatif.",
      outro: "Nous avons hâte de vous accueillir.",
      signature: "L'équipe HYMEA",
      labelPrestation: "Prestation",
      labelCreneau: "Créneau confirmé",
      labelAdresse: "Adresse d'intervention",
      creneauAPreciser: "À préciser ensemble",
      footerNote: "Conciergerie & nettoyage premium — Israël",
    },
    en: {
      subject: "Your appointment is confirmed — HYMEA",
      preheader: "Your appointment is confirmed.",
      heading: "Appointment confirmed",
      intro: "Good news: your appointment is confirmed. Here is the summary.",
      outro: "We look forward to welcoming you.",
      signature: "The HYMEA team",
      labelPrestation: "Service",
      labelCreneau: "Confirmed slot",
      labelAdresse: "Service address",
      creneauAPreciser: "To be arranged together",
      footerNote: "Premium concierge & cleaning — Israel",
    },
    he: {
      subject: "הפגישה שלך אושרה — HYMEA",
      preheader: "הפגישה שלך אושרה.",
      heading: "הפגישה אושרה",
      intro: "חדשות טובות: הפגישה שלך אושרה. להלן הסיכום.",
      outro: "נשמח לארח אותך.",
      signature: "צוות HYMEA",
      labelPrestation: "שירות",
      labelCreneau: "מועד מאושר",
      labelAdresse: "כתובת השירות",
      creneauAPreciser: "ייקבע יחד",
      footerNote: "קונסיירז' וניקיון פרימיום — ישראל",
    },
  },
  replanification: {
    fr: {
      subject: "Votre rendez-vous a été replanifié — HYMEA",
      preheader: "Votre rendez-vous a été replanifié.",
      heading: "Rendez-vous replanifié",
      intro:
        "Votre rendez-vous a été replanifié. Voici le nouveau créneau ; contactez-nous s'il ne vous convient pas.",
      outro: "Merci de votre compréhension.",
      signature: "L'équipe HYMEA",
      labelPrestation: "Prestation",
      labelCreneau: "Nouveau créneau",
      labelAdresse: "Adresse d'intervention",
      creneauAPreciser: "À préciser ensemble",
      footerNote: "Conciergerie & nettoyage premium — Israël",
    },
    en: {
      subject: "Your appointment has been rescheduled — HYMEA",
      preheader: "Your appointment has been rescheduled.",
      heading: "Appointment rescheduled",
      intro:
        "Your appointment has been rescheduled. Here is the new slot; let us know if it doesn't suit you.",
      outro: "Thank you for your understanding.",
      signature: "The HYMEA team",
      labelPrestation: "Service",
      labelCreneau: "New slot",
      labelAdresse: "Service address",
      creneauAPreciser: "To be arranged together",
      footerNote: "Premium concierge & cleaning — Israel",
    },
    he: {
      subject: "הפגישה שלך תוזמנה מחדש — HYMEA",
      preheader: "הפגישה שלך תוזמנה מחדש.",
      heading: "הפגישה תוזמנה מחדש",
      intro: "הפגישה שלך תוזמנה מחדש. להלן המועד החדש; עדכן אותנו אם אינו מתאים.",
      outro: "תודה על ההבנה.",
      signature: "צוות HYMEA",
      labelPrestation: "שירות",
      labelCreneau: "מועד חדש",
      labelAdresse: "כתובת השירות",
      creneauAPreciser: "ייקבע יחד",
      footerNote: "קונסיירז' וניקיון פרימיום — ישראל",
    },
  },
  annulation: {
    fr: {
      subject: "Votre rendez-vous a été annulé — HYMEA",
      preheader: "Votre rendez-vous a été annulé.",
      heading: "Rendez-vous annulé",
      intro:
        "Votre rendez-vous a été annulé. Si vous le souhaitez, vous pouvez formuler une nouvelle demande à tout moment.",
      outro: "Nous restons à votre disposition.",
      signature: "L'équipe HYMEA",
      labelPrestation: "Prestation",
      labelCreneau: "Créneau annulé",
      labelAdresse: "Adresse d'intervention",
      creneauAPreciser: "Non précisé",
      footerNote: "Conciergerie & nettoyage premium — Israël",
    },
    en: {
      subject: "Your appointment has been cancelled — HYMEA",
      preheader: "Your appointment has been cancelled.",
      heading: "Appointment cancelled",
      intro:
        "Your appointment has been cancelled. You are welcome to submit a new request at any time.",
      outro: "We remain at your service.",
      signature: "The HYMEA team",
      labelPrestation: "Service",
      labelCreneau: "Cancelled slot",
      labelAdresse: "Service address",
      creneauAPreciser: "Not specified",
      footerNote: "Premium concierge & cleaning — Israel",
    },
    he: {
      subject: "הפגישה שלך בוטלה — HYMEA",
      preheader: "הפגישה שלך בוטלה.",
      heading: "הפגישה בוטלה",
      intro: "הפגישה שלך בוטלה. ניתן להגיש בקשה חדשה בכל עת.",
      outro: "אנו לרשותך.",
      signature: "צוות HYMEA",
      labelPrestation: "שירות",
      labelCreneau: "מועד שבוטל",
      labelAdresse: "כתובת השירות",
      creneauAPreciser: "לא צוין",
      footerNote: "קונסיירז' וניקיון פרימיום — ישראל",
    },
  },
};

const BONJOUR: Record<Locale, (prenom: string) => string> = {
  fr: (p) => `Bonjour ${p},`,
  en: (p) => `Hello ${p},`,
  he: (p) => `שלום ${p},`,
};

/** Une ligne « label : valeur » du tableau récapitulatif. */
function detailRow(label: string, value: string, align: "left" | "right"): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2620;font-family:${FONT_LABEL};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.cremeAttenue};text-align:${align};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2620;font-family:${FONT_CORPS};font-size:17px;color:${COLORS.ivoire};text-align:${align === "left" ? "right" : "left"};vertical-align:top;">${esc(value)}</td>
    </tr>`;
}

/** Construit le HTML complet d'un email RDV (layout charté + RTL). */
function renderLayout(type: EmailType, vars: RdvEmailVars): MailContent {
  const t = DICT[type][vars.locale];
  const direction = dir(vars.locale);
  const start = direction === "rtl" ? "right" : "left";
  const creneau = vars.creneau ?? t.creneauAPreciser;

  const rows = [
    detailRow(t.labelPrestation, vars.prestationLibelle, start),
    detailRow(t.labelCreneau, creneau, start),
    vars.adresse ? detailRow(t.labelAdresse, vars.adresse, start) : "",
  ].join("");

  const html = `<!doctype html>
<html lang="${vars.locale}" dir="${direction}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark" />
<title>${esc(t.subject)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cormorant+Garamond:wght@400;500&family=Jost:wght@400;500&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:${COLORS.charbon};">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;">${esc(t.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.charbon};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:${COLORS.charbonClair};border:1px solid #2a2620;" dir="${direction}">
          <!-- En-tête / logotype -->
          <tr>
            <td align="center" style="padding:36px 40px 24px;">
              <div style="font-family:${FONT_TITRE};font-size:30px;letter-spacing:8px;color:${COLORS.orChampagne};text-transform:uppercase;">HYMEA</div>
              <div style="margin-top:18px;height:1px;width:56px;background-color:${COLORS.orProfond};"></div>
            </td>
          </tr>
          <!-- Titre -->
          <tr>
            <td style="padding:8px 40px 0;text-align:${start};">
              <h1 style="margin:0;font-family:${FONT_TITRE};font-weight:500;font-size:23px;line-height:1.3;letter-spacing:1px;color:${COLORS.ivoire};">${esc(t.heading)}</h1>
            </td>
          </tr>
          <!-- Corps -->
          <tr>
            <td style="padding:20px 40px 8px;text-align:${start};">
              <p style="margin:0 0 14px;font-family:${FONT_CORPS};font-size:18px;line-height:1.65;color:${COLORS.creme};">${esc(BONJOUR[vars.locale](vars.prenom))}</p>
              <p style="margin:0;font-family:${FONT_CORPS};font-size:18px;line-height:1.65;color:${COLORS.creme};">${esc(t.intro)}</p>
            </td>
          </tr>
          <!-- Récapitulatif -->
          <tr>
            <td style="padding:24px 40px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${direction}">${rows}</table>
            </td>
          </tr>
          <!-- Clôture + signature -->
          <tr>
            <td style="padding:24px 40px 36px;text-align:${start};">
              <p style="margin:0 0 20px;font-family:${FONT_CORPS};font-size:18px;line-height:1.65;color:${COLORS.creme};">${esc(t.outro)}</p>
              <p style="margin:0;font-family:${FONT_LABEL};font-size:13px;letter-spacing:1px;color:${COLORS.orChampagne};">${esc(t.signature)}</p>
            </td>
          </tr>
          <!-- Pied de page -->
          <tr>
            <td align="center" style="padding:24px 40px 32px;border-top:1px solid #2a2620;">
              <a href="${esc(vars.siteUrl)}" style="font-family:${FONT_LABEL};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.orProfond};text-decoration:none;">hymea.com</a>
              <p style="margin:10px 0 0;font-family:${FONT_LABEL};font-size:12px;letter-spacing:0.5px;color:${COLORS.cremeAttenue};">${esc(t.footerNote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    BONJOUR[vars.locale](vars.prenom),
    "",
    t.intro,
    "",
    `${t.labelPrestation}: ${vars.prestationLibelle}`,
    `${t.labelCreneau}: ${creneau}`,
    vars.adresse ? `${t.labelAdresse}: ${vars.adresse}` : "",
    "",
    t.outro,
    t.signature,
    "",
    "hymea.com",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject: t.subject, html, text };
}

/** Rendu d'un email RDV destiné au client (langue du client). */
export function renderRdvEmail(type: EmailType, vars: RdvEmailVars): MailContent {
  return renderLayout(type, vars);
}

/** Variables de la notification interne HYMEA. */
export interface HymeaNotificationVars {
  type: EmailType;
  clientNom: string;
  clientPrenom: string;
  clientEmail: string;
  clientTelephone: string;
  typeClient: string;
  prestationLibelle: string;
  creneau: string | null;
  adresse: string | null;
  adminUrl: string;
}

const NOTIF_LIBELLE: Record<EmailType, string> = {
  demande_recue: "Nouvelle demande de RDV",
  confirmation: "RDV confirmé",
  replanification: "RDV replanifié",
  annulation: "RDV annulé",
};

/** Notification interne (équipe HYMEA) — FR, sobre, factuelle. */
export function renderHymeaNotification(vars: HymeaNotificationVars): MailContent {
  const titre = NOTIF_LIBELLE[vars.type];
  const subject = `[HYMEA] ${titre} — ${vars.clientPrenom} ${vars.clientNom}`;
  const rows = [
    detailRow("Client", `${vars.clientPrenom} ${vars.clientNom}`, "left"),
    detailRow("Email", vars.clientEmail, "left"),
    detailRow("Téléphone", vars.clientTelephone, "left"),
    detailRow("Type", vars.typeClient, "left"),
    detailRow("Prestation", vars.prestationLibelle, "left"),
    detailRow("Créneau", vars.creneau ?? "Non précisé", "left"),
    vars.adresse ? detailRow("Adresse", vars.adresse, "left") : "",
  ].join("");

  const html = `<!doctype html>
<html lang="fr" dir="ltr">
<head><meta charset="utf-8" /><meta name="color-scheme" content="dark" /><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background-color:${COLORS.charbon};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.charbon};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:${COLORS.charbonClair};border:1px solid #2a2620;">
        <tr><td align="center" style="padding:32px 36px 20px;">
          <div style="font-family:${FONT_TITRE};font-size:26px;letter-spacing:7px;color:${COLORS.orChampagne};text-transform:uppercase;">HYMEA</div>
          <div style="margin-top:16px;height:1px;width:48px;background-color:${COLORS.orProfond};"></div>
        </td></tr>
        <tr><td style="padding:4px 36px 0;">
          <h1 style="margin:0;font-family:${FONT_TITRE};font-weight:500;font-size:24px;letter-spacing:0.5px;color:${COLORS.ivoire};">${esc(titre)}</h1>
        </td></tr>
        <tr><td style="padding:18px 36px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
        <tr><td style="padding:24px 36px 32px;">
          <a href="${esc(vars.adminUrl)}" style="display:inline-block;font-family:${FONT_LABEL};font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.charbon};background-color:${COLORS.orChampagne};padding:13px 26px;text-decoration:none;">Ouvrir le back-office</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    titre,
    "",
    `Client: ${vars.clientPrenom} ${vars.clientNom}`,
    `Email: ${vars.clientEmail}`,
    `Téléphone: ${vars.clientTelephone}`,
    `Type: ${vars.typeClient}`,
    `Prestation: ${vars.prestationLibelle}`,
    `Créneau: ${vars.creneau ?? "Non précisé"}`,
    vars.adresse ? `Adresse: ${vars.adresse}` : "",
    "",
    vars.adminUrl,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}
