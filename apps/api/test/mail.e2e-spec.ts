/**
 * Tests des templates d'emails transactionnels (issue #16).
 * Fonctions de rendu pures : trilingue, RTL hébreu, échappement HTML, version texte.
 */
import { emailTypes, locales } from "@hymea/shared";

import { type RdvEmailVars, renderHymeaNotification, renderRdvEmail } from "../src/mail/templates";

function vars(overrides: Partial<RdvEmailVars> = {}): RdvEmailVars {
  return {
    prenom: "David",
    prestationLibelle: "Nettoyage premium",
    creneau: "mardi 1 juillet 2026 à 09:00",
    adresse: "12 rue Herzl, Tel Aviv",
    locale: "fr",
    siteUrl: "https://hymea.com",
    ...overrides,
  };
}

describe("Templates email (unit)", () => {
  describe("renderRdvEmail — couverture type × locale", () => {
    for (const type of emailTypes) {
      for (const locale of locales) {
        it(`génère sujet + html + texte pour ${type}/${locale}`, () => {
          const mail = renderRdvEmail(type, vars({ locale }));
          expect(mail.subject.length).toBeGreaterThan(0);
          expect(mail.html).toContain("<!doctype html>");
          expect(mail.html).toContain(`lang="${locale}"`);
          expect(mail.text.length).toBeGreaterThan(0);
          expect(mail.html).toContain("HYMEA");
        });
      }
    }
  });

  it("applique dir=rtl pour l'hébreu et ltr sinon", () => {
    expect(renderRdvEmail("confirmation", vars({ locale: "he" })).html).toContain('dir="rtl"');
    expect(renderRdvEmail("confirmation", vars({ locale: "fr" })).html).toContain('dir="ltr"');
    expect(renderRdvEmail("confirmation", vars({ locale: "en" })).html).toContain('dir="ltr"');
  });

  it("produit des sujets distincts par langue", () => {
    const fr = renderRdvEmail("confirmation", vars({ locale: "fr" })).subject;
    const en = renderRdvEmail("confirmation", vars({ locale: "en" })).subject;
    const he = renderRdvEmail("confirmation", vars({ locale: "he" })).subject;
    expect(new Set([fr, en, he]).size).toBe(3);
  });

  it("respecte la charte graphique (couleurs charbon/or)", () => {
    const html = renderRdvEmail("demande_recue", vars()).html;
    expect(html).toContain("#100e0b"); // charbon
    expect(html).toContain("#c2a36b"); // or champagne
  });

  it("affiche un repli quand le créneau est absent", () => {
    const mail = renderRdvEmail("demande_recue", vars({ creneau: null }));
    expect(mail.html).toContain("À préciser ensemble");
  });

  it("échappe le HTML injecté dans les variables (anti-XSS)", () => {
    const mail = renderRdvEmail(
      "demande_recue",
      vars({ prenom: "<script>alert(1)</script>", adresse: "<img src=x onerror=alert(1)>" }),
    );
    expect(mail.html).not.toContain("<script>alert(1)</script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<img src=x onerror");
  });

  it("omet la ligne adresse quand elle est nulle", () => {
    const fr = renderRdvEmail("confirmation", vars({ adresse: null }));
    expect(fr.html).not.toContain("Adresse d'intervention");
  });

  describe("renderHymeaNotification", () => {
    it("génère une notification interne FR factuelle", () => {
      const mail = renderHymeaNotification({
        type: "demande_recue",
        clientNom: "Cohen",
        clientPrenom: "David",
        clientEmail: "david@example.com",
        clientTelephone: "+972500000000",
        typeClient: "particulier",
        prestationLibelle: "Nettoyage premium",
        creneau: "mardi 1 juillet 2026 à 09:00",
        adresse: "12 rue Herzl",
        adminUrl: "https://hymea.com/admin",
      });
      expect(mail.subject).toContain("Nouvelle demande de RDV");
      expect(mail.subject).toContain("David Cohen");
      expect(mail.html).toContain("david@example.com");
      expect(mail.html).toContain("https://hymea.com/admin");
      expect(mail.text).toContain("+972500000000");
    });

    it("échappe les PII dans la notification interne", () => {
      const mail = renderHymeaNotification({
        type: "annulation",
        clientNom: "<b>x</b>",
        clientPrenom: "y",
        clientEmail: "y@example.com",
        clientTelephone: "0",
        typeClient: "mall",
        prestationLibelle: "p",
        creneau: null,
        adresse: null,
        adminUrl: "https://hymea.com/admin",
      });
      expect(mail.html).not.toContain("<b>x</b>");
    });
  });
});
