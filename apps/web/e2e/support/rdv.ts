import { expect, type Page } from "@playwright/test";

/**
 * Outils partagés des suites E2E du funnel RDV (#28/#29). L'API n'est pas
 * disponible en CI : toutes les routes `/api` sont interceptées et fournies par
 * `mockRdvApi`. Les libellés FR servent de référence pour piloter le parcours.
 */

const ISO = "2026-01-01T00:00:00.000Z";

/** Prestations factices par cible (forme @hymea/shared : Prestation). */
export const PRESTATIONS = {
  mall: [
    {
      id: "p-mall-1",
      libelle: { fr: "Présentation SEGULA", en: "SEGULA presentation", he: "מצגת SEGULA" },
      description: {
        fr: "Découverte du concept.",
        en: "Concept walkthrough.",
        he: "היכרות עם הקונספט.",
      },
      cible: "mall",
      dureeMinutes: 60,
      actif: true,
      createdAt: ISO,
      updatedAt: ISO,
    },
  ],
  entreprise: [
    {
      id: "p-ent-1",
      libelle: { fr: "Audit des bureaux", en: "Office audit", he: "ביקורת משרדים" },
      description: { fr: "Évaluation des espaces.", en: "Spaces assessment.", he: "הערכת מרחבים." },
      cible: "entreprise",
      dureeMinutes: 90,
      actif: true,
      createdAt: ISO,
      updatedAt: ISO,
    },
  ],
  particulier: [
    {
      id: "p-part-1",
      libelle: { fr: "Entretien habitation", en: "Home care", he: "טיפוח הבית" },
      description: { fr: "Nettoyage en profondeur.", en: "Deep cleaning.", he: "ניקיון יסודי." },
      cible: "particulier",
      dureeMinutes: 120,
      actif: true,
      createdAt: ISO,
      updatedAt: ISO,
    },
    {
      id: "p-part-2",
      libelle: { fr: "Detailing véhicule", en: "Vehicle detailing", he: "פירוט רכב" },
      description: null,
      cible: "particulier",
      dureeMinutes: 90,
      actif: true,
      createdAt: ISO,
      updatedAt: ISO,
    },
  ],
} as const;

/** Deux créneaux factices (instants UTC), indépendants de la date demandée. */
export const SLOTS = [
  { debut: "2030-06-02T06:00:00.000Z", fin: "2030-06-02T08:00:00.000Z" },
  { debut: "2030-06-02T09:00:00.000Z", fin: "2030-06-02T11:00:00.000Z" },
];

type MockOptions = {
  emptyPrestations?: boolean;
  slotsError?: boolean;
  rateLimited?: boolean;
};

/** Installe les mocks des trois endpoints publics consommés par le funnel. */
export async function mockRdvApi(page: Page, options: MockOptions = {}) {
  await page.route("**/prestations/public**", async (route) => {
    const cible = new URL(route.request().url()).searchParams.get("cible") ?? "";
    const data = options.emptyPrestations
      ? []
      : ((PRESTATIONS as Record<string, readonly unknown[]>)[cible] ?? []);
    await route.fulfill({ json: data });
  });

  await page.route("**/slots**", async (route) => {
    if (options.slotsError) {
      await route.fulfill({ status: 500, json: { message: "boom" } });
      return;
    }
    await route.fulfill({ json: { date: "2030-06-02", dureeMinutes: 60, slots: SLOTS } });
  });

  await page.route("**/rendez-vous", async (route) => {
    if (options.rateLimited) {
      await route.fulfill({ status: 429, json: { message: "Too many requests" } });
      return;
    }
    const body = route.request().postDataJSON() as { debut?: string };
    await route.fulfill({
      status: 201,
      json: {
        id: "RDV-TEST-0001",
        clientId: "client-1",
        prestationId: "p-1",
        intervenantId: null,
        typeClient: "particulier",
        statut: "NOUVEAU",
        debut: body.debut ?? null,
        fin: null,
        adresse: null,
        message: null,
        surfaceM2: null,
        nombrePieces: null,
        locale: "fr",
        consentement: { accepte: true, date: ISO, version: "2026-06-v1" },
        reminderSentAt: null,
        createdAt: ISO,
        updatedAt: ISO,
      },
    });
  });
}

/** Libellés FR de pilotage (référence). */
export const FR = {
  next: "Continuer",
  back: "Retour",
  submit: "Valider ma demande",
  typeMall: "Centre commercial",
  typeEntreprise: "Entreprise",
  typeParticulier: "Particulier",
  nextMonth: "Mois suivant",
  contactToggle: /Je préfère être recontacté/i,
};

/** Renseigne les coordonnées requises de l'étape 2 (FR). `withAddress` pour un particulier. */
export async function fillCoordinates(page: Page, withAddress: boolean) {
  await page.locator("#rdv-nom").fill("Cohen");
  await page.locator("#rdv-prenom").fill("David");
  await page.locator("#rdv-email").fill("david.cohen@example.com");
  await page.locator("#rdv-telephone").fill("+972500000000");
  if (withAddress) await page.locator("#rdv-adresse").fill("12 rue Herzl, Tel Aviv");
}

/** Choisit une date du mois suivant (toujours future) puis le 1ᵉʳ créneau. */
export async function pickFirstSlot(page: Page) {
  await page.getByRole("button", { name: FR.nextMonth }).click();
  await page.getByRole("button", { name: "15", exact: true }).click();
  // Le 1ᵉʳ créneau renvoyé par le mock (boutons au format HH:MM).
  const slot = page.getByRole("button").filter({ hasText: /^\d{2}:\d{2}$/ });
  await slot.first().click();
}

/** Coche le consentement RGPD à l'étape 4. */
export async function acceptConsent(page: Page) {
  await page.getByRole("checkbox").check();
}

/** Attend l'écran de confirmation et son numéro de référence. */
export async function expectConfirmation(page: Page) {
  await expect(page.getByText(/RDV-TEST-0001/)).toBeVisible();
}
