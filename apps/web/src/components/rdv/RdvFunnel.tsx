"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale, Prestation, RendezVous, TypeClient } from "@hymea/shared";
import { ApiError, createRendezVous, fetchPrestations } from "@/lib/api";
import { formatLongDate, formatSlotTime } from "@/lib/datetime";
import { Button } from "@/components/ui/Button";
import { Field } from "./Field";
import { RgpdConsent } from "./RgpdConsent";
import { SlotPicker } from "./SlotPicker";
import { StepIndicator } from "./StepIndicator";

const STEP_KEYS = ["service", "details", "slot", "confirm"] as const;
const TYPE_ORDER: readonly TypeClient[] = ["mall", "entreprise", "particulier"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RdvFunnelProps = {
  /** Type pré-sélectionné via `?type=` depuis les CTA des pages univers. */
  initialType: TypeClient | null;
};

/**
 * Funnel de prise de rendez-vous en 4 étapes (#28) : Service → Coordonnées →
 * Créneau → Validation. Champs et obligations adaptés au type de client
 * (CDC 5.2) : le particulier choisit un créneau et fournit une adresse ;
 * mall/entreprise peuvent simplement demander à être recontactés. La validation
 * intègre le consentement RGPD et l'anti-spam (#29) puis soumet à l'API publique.
 */
export function RdvFunnel({ initialType }: RdvFunnelProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Rdv");
  const headingId = useId();

  const [step, setStep] = useState(0);
  const [typeClient, setTypeClient] = useState<TypeClient | null>(initialType);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [prestationsStatus, setPrestationsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [prestationId, setPrestationId] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [surface, setSurface] = useState("");
  const [pieces, setPieces] = useState("");
  const [message, setMessage] = useState("");

  const [debut, setDebut] = useState<string | null>(null);
  const [contactRequested, setContactRequested] = useState(false);

  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<RendezVous | null>(null);

  const isParticulier = typeClient === "particulier";
  const onToken = useCallback((value: string) => setToken(value), []);

  // Charge les prestations actives de la cible dès qu'un type est choisi.
  useEffect(() => {
    if (!typeClient) return;
    let cancelled = false;
    setPrestationsStatus("loading");
    setPrestations([]);
    setPrestationId(null);
    fetchPrestations(typeClient)
      .then((list) => {
        if (cancelled) return;
        setPrestations(list);
        setPrestationsStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setPrestationsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [typeClient]);

  function chooseType(next: TypeClient) {
    setTypeClient(next);
    // Le créneau et les champs spécifiques au particulier ne valent plus.
    setDebut(null);
    setContactRequested(false);
  }

  // Ordre des champs de l'étape 2, pour porter le focus sur le 1ᵉʳ en erreur.
  const DETAIL_FIELDS = ["nom", "prenom", "email", "telephone", "adresse", "surface", "pieces"];

  function validateDetails(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!nom.trim()) next.nom = t("errors.required");
    if (!prenom.trim()) next.prenom = t("errors.required");
    if (!email.trim()) next.email = t("errors.required");
    else if (!EMAIL_RE.test(email.trim())) next.email = t("errors.email");
    if (!telephone.trim()) next.telephone = t("errors.required");
    if (isParticulier && !adresse.trim()) next.adresse = t("errors.required");
    if (surface && !(Number.isInteger(Number(surface)) && Number(surface) > 0))
      next.surface = t("errors.positiveInt");
    if (pieces && !(Number.isInteger(Number(pieces)) && Number(pieces) > 0))
      next.pieces = t("errors.positiveInt");
    setErrors(next);
    return next;
  }

  const canLeaveService = Boolean(typeClient && prestationId);
  const canLeaveSlot = isParticulier ? Boolean(debut) : true;

  function goNext() {
    if (step === 1) {
      const fieldErrors = validateDetails();
      const firstInvalid = DETAIL_FIELDS.find((field) => fieldErrors[field]);
      if (firstInvalid) {
        document.getElementById(`rdv-${firstInvalid}`)?.focus();
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  }

  // Indice contextuel quand l'action principale est désactivée (anti « bouton mort »).
  const ctaHint =
    step === 0 && !canLeaveService
      ? t("actions.hintService")
      : step === 2 && !canLeaveSlot
        ? t("actions.hintSlot")
        : step === 3 && !consent
          ? t("actions.hintConsent")
          : null;

  function goBack() {
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function pickSlot(value: string) {
    setDebut(value);
    setContactRequested(false);
  }

  function toggleContactRequested(value: boolean) {
    setContactRequested(value);
    if (value) setDebut(null);
  }

  async function submit() {
    if (!typeClient || !prestationId || !consent) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const rdv = await createRendezVous({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
        typeClient,
        prestationId,
        debut: debut ?? undefined,
        adresse: adresse.trim() || undefined,
        message: message.trim() || undefined,
        surfaceM2: surface ? Number(surface) : undefined,
        nombrePieces: pieces ? Number(pieces) : undefined,
        locale,
        consentement: true,
        turnstileToken: token || undefined,
        website,
      });
      setConfirmation(rdv);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && err.status === 429
          ? t("errors.rateLimited")
          : t("errors.generic"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <Confirmation reference={confirmation.id} scheduled={confirmation.debut} locale={locale} />
    );
  }

  const prestationLabel = (prestation: Prestation) => prestation.libelle[locale];

  return (
    <section aria-labelledby={headingId} className="border-b border-encre/10">
      <div className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h1
          id={headingId}
          className="mt-5 font-title text-[length:var(--text-h1)] leading-[1.1] text-encre"
        >
          {t("title")}
        </h1>
        <p className="mt-5 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
          {t("subtitle")}
        </p>

        <div className="mt-10">
          <StepIndicator current={step} steps={STEP_KEYS} />
        </div>

        <div className="mt-10">
          {/* Étape 1 — Service */}
          {step === 0 ? (
            <div className="space-y-10">
              <fieldset>
                <legend className="font-label text-xs uppercase tracking-[0.2em] text-encre/70">
                  {t("type.legend")}
                </legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {TYPE_ORDER.map((type) => {
                    const active = typeClient === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={active}
                        onClick={() => chooseType(type)}
                        className={[
                          "border p-5 text-start transition-colors",
                          active ? "border-or bg-ivoire" : "border-encre/15 hover:border-or/60",
                        ].join(" ")}
                      >
                        <span className="block font-title text-[length:var(--text-h3)] text-encre">
                          {t(`type.${type}`)}
                        </span>
                        <span className="mt-2 block text-sm leading-relaxed text-encre/65">
                          {t(`type.${type}Hint`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {typeClient ? (
                <PrestationPicker
                  status={prestationsStatus}
                  prestations={prestations}
                  selected={prestationId}
                  onSelect={setPrestationId}
                  label={prestationLabel}
                  describe={(p) => p.description?.[locale] ?? null}
                  duration={(minutes) => t("prestation.duration", { minutes })}
                  legend={t("prestation.legend")}
                  loadingLabel={t("prestation.loading")}
                  errorLabel={t("prestation.error")}
                  emptyLabel={t("prestation.empty")}
                />
              ) : null}
            </div>
          ) : null}

          {/* Étape 2 — Coordonnées */}
          {step === 1 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <p className="font-label text-xs tracking-wide text-encre/55 sm:col-span-2">
                {t("fields.requiredNote")}
              </p>
              <Field
                id="rdv-nom"
                label={t("fields.nom")}
                value={nom}
                onChange={setNom}
                required
                autoComplete="family-name"
                error={errors.nom}
              />
              <Field
                id="rdv-prenom"
                label={t("fields.prenom")}
                value={prenom}
                onChange={setPrenom}
                required
                autoComplete="given-name"
                error={errors.prenom}
              />
              <Field
                id="rdv-email"
                label={t("fields.email")}
                value={email}
                onChange={setEmail}
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                error={errors.email}
              />
              <Field
                id="rdv-telephone"
                label={t("fields.telephone")}
                value={telephone}
                onChange={setTelephone}
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                error={errors.telephone}
              />
              {isParticulier ? (
                <>
                  <div className="sm:col-span-2">
                    <Field
                      id="rdv-adresse"
                      label={t("fields.adresse")}
                      value={adresse}
                      onChange={setAdresse}
                      required
                      autoComplete="street-address"
                      error={errors.adresse}
                    />
                  </div>
                  <Field
                    id="rdv-surface"
                    label={t("fields.surface")}
                    value={surface}
                    onChange={setSurface}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    optionalHint={t("fields.optional")}
                    error={errors.surface}
                  />
                  <Field
                    id="rdv-pieces"
                    label={t("fields.pieces")}
                    value={pieces}
                    onChange={setPieces}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    optionalHint={t("fields.optional")}
                    error={errors.pieces}
                  />
                </>
              ) : null}
              <div className="sm:col-span-2">
                <Field
                  id="rdv-message"
                  label={t("fields.message")}
                  value={message}
                  onChange={setMessage}
                  multiline
                  optionalHint={t("fields.optional")}
                  placeholder={t("fields.placeholderMessage")}
                />
              </div>
            </div>
          ) : null}

          {/* Étape 3 — Créneau */}
          {step === 2 ? (
            <div className="space-y-8">
              <p className="max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
                {isParticulier ? t("slot.introRequired") : t("slot.introOptional")}
              </p>

              {!isParticulier ? (
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={contactRequested}
                    onChange={(event) => toggleContactRequested(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-or-profond)]"
                  />
                  <span className="text-[length:var(--text-lead)] leading-relaxed text-encre/80">
                    {t("slot.contactToggle")}
                  </span>
                </label>
              ) : null}

              {prestationId && !contactRequested ? (
                <SlotPicker prestationId={prestationId} selectedDebut={debut} onSelect={pickSlot} />
              ) : null}
            </div>
          ) : null}

          {/* Étape 4 — Validation */}
          {step === 3 ? (
            <div className="space-y-10">
              <Recap
                typeLabel={typeClient ? t(`type.${typeClient}`) : "—"}
                serviceLabel={
                  prestations.find((p) => p.id === prestationId)?.libelle[locale] ?? "—"
                }
                debut={debut}
                contactRequested={!isParticulier && !debut}
                adresse={isParticulier ? adresse : ""}
                fullName={`${prenom} ${nom}`.trim()}
                email={email}
                telephone={telephone}
                locale={locale}
              />

              <RgpdConsent
                consent={consent}
                onConsentChange={setConsent}
                website={website}
                onWebsiteChange={setWebsite}
                onToken={onToken}
              />

              {submitError ? (
                <p role="alert" className="font-label text-sm tracking-wide text-red-700">
                  {submitError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Barre de navigation */}
        <div className="mt-12 space-y-3">
          {ctaHint ? (
            <p className="text-end font-label text-xs tracking-wide text-encre/55">{ctaHint}</p>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            {step > 0 ? (
              <Button variant="ghost" onClick={goBack}>
                {t("actions.back")}
              </Button>
            ) : (
              <span />
            )}

            {step < STEP_KEYS.length - 1 ? (
              <Button
                variant="primary"
                onClick={goNext}
                disabled={(step === 0 && !canLeaveService) || (step === 2 && !canLeaveSlot)}
              >
                {t("actions.next")}
              </Button>
            ) : (
              <Button variant="primary" onClick={submit} disabled={!consent || submitting}>
                {submitting ? t("actions.submitting") : t("actions.submit")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Liste de prestations en boutons radio, fidèle à la charte. */
function PrestationPicker({
  status,
  prestations,
  selected,
  onSelect,
  label,
  describe,
  duration,
  legend,
  loadingLabel,
  errorLabel,
  emptyLabel,
}: {
  status: "idle" | "loading" | "error";
  prestations: Prestation[];
  selected: string | null;
  onSelect: (id: string) => void;
  label: (p: Prestation) => string;
  describe: (p: Prestation) => string | null;
  duration: (minutes: number) => string;
  legend: string;
  loadingLabel: string;
  errorLabel: string;
  emptyLabel: string;
}) {
  return (
    <fieldset aria-busy={status === "loading"}>
      <legend className="font-label text-xs uppercase tracking-[0.2em] text-encre/70">
        {legend}
      </legend>

      {status === "loading" ? <p className="mt-4 text-encre/60">{loadingLabel}</p> : null}
      {status === "error" ? <p className="mt-4 text-encre/70">{errorLabel}</p> : null}
      {status === "idle" && prestations.length === 0 ? (
        <p className="mt-4 text-encre/70">{emptyLabel}</p>
      ) : null}

      {prestations.length > 0 ? (
        <div className="mt-4 space-y-3">
          {prestations.map((prestation) => {
            const active = selected === prestation.id;
            const description = describe(prestation);
            return (
              <label
                key={prestation.id}
                className={[
                  "flex cursor-pointer items-start gap-4 border p-5 transition-colors",
                  active ? "border-or bg-ivoire" : "border-encre/15 hover:border-or/60",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="prestation"
                  checked={active}
                  onChange={() => onSelect(prestation.id)}
                  className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--color-or-profond)]"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="font-title text-[length:var(--text-h3)] text-encre">
                      {label(prestation)}
                    </span>
                    <span className="font-label text-xs uppercase tracking-wider text-or-profond">
                      {duration(prestation.dureeMinutes)}
                    </span>
                  </span>
                  {description ? (
                    <span className="mt-2 block text-sm leading-relaxed text-encre/65">
                      {description}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

/** Récapitulatif de la demande avant validation. */
function Recap({
  typeLabel,
  serviceLabel,
  debut,
  contactRequested,
  adresse,
  fullName,
  email,
  telephone,
  locale,
}: {
  typeLabel: string;
  serviceLabel: string;
  debut: string | null;
  contactRequested: boolean;
  adresse: string;
  fullName: string;
  email: string;
  telephone: string;
  locale: Locale;
}) {
  const t = useTranslations("Rdv.recap");
  const when = debut
    ? `${formatLongDate(debut, locale)} · ${formatSlotTime(debut, locale)}`
    : contactRequested
      ? t("whenContact")
      : t("whenUnset");

  const rows: { label: string; value: string }[] = [
    { label: t("type"), value: typeLabel },
    { label: t("service"), value: serviceLabel },
    { label: t("when"), value: when },
  ];
  if (adresse) rows.push({ label: t("where"), value: adresse });
  rows.push({ label: t("who"), value: fullName });
  rows.push({ label: t("contact"), value: `${email} · ${telephone}` });

  return (
    <dl className="divide-y divide-encre/10 border-y border-encre/10">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[10rem_1fr] gap-4 py-4">
          <dt className="font-label text-xs uppercase tracking-[0.18em] text-encre/55">
            {row.label}
          </dt>
          <dd className="text-encre">
            <bdi>{row.value}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Écran de confirmation post-soumission. */
function Confirmation({
  reference,
  scheduled,
  locale,
}: {
  reference: string;
  scheduled: string | null;
  locale: Locale;
}) {
  const t = useTranslations("Rdv.confirmation");

  return (
    <section className="border-b border-encre/10">
      <div className="mx-auto max-w-2xl px-6 py-20 text-center lg:py-28">
        <p className="font-label text-sm uppercase tracking-[0.3em] text-or-profond">
          {t("eyebrow")}
        </p>
        <h1 className="mt-5 font-title text-[length:var(--text-h1)] leading-[1.1] text-encre">
          {t("title")}
        </h1>
        <p className="mx-auto mt-6 max-w-[var(--measure)] text-[length:var(--text-lead)] leading-relaxed text-encre/75">
          {t("body")}
        </p>
        {scheduled ? (
          <p className="mt-4 text-[length:var(--text-lead)] text-encre">
            <bdi>
              {t("scheduled", {
                when: `${formatLongDate(scheduled, locale)} · ${formatSlotTime(scheduled, locale)}`,
              })}
            </bdi>
          </p>
        ) : null}
        <p className="mt-8 font-label text-xs uppercase tracking-wider text-encre/45">
          {t("reference", { reference })}
        </p>
        <div className="mt-12">
          <Button href="/" variant="primary">
            {t("backHome")}
          </Button>
        </div>
      </div>
    </section>
  );
}
