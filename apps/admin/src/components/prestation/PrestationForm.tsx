"use client";

import { useState } from "react";
import { locales, typesClient, type I18nText, type Prestation } from "@hymea/shared";
import { ApiError, createPrestation, updatePrestation, type PrestationPayload } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { fieldClass, labelClass } from "@/components/ui/form";
import { typeClientLabel } from "@/lib/status";

const LOCALE_LABEL: Record<(typeof locales)[number], string> = {
  fr: "Français",
  en: "English",
  he: "עברית",
};

function emptyI18n(): I18nText {
  return { fr: "", en: "", he: "" };
}

/** Bloc de saisie d'un texte i18n (un champ par langue). */
function I18nField({
  legend,
  value,
  onChange,
  required,
}: {
  legend: string;
  value: I18nText;
  onChange: (next: I18nText) => void;
  required?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-sm border border-sable/70 p-3">
      <legend className="px-1 font-ui text-xs font-medium uppercase tracking-wider text-encre-doux">
        {legend}
      </legend>
      {locales.map((loc) => (
        <label key={loc} className="flex flex-col gap-1">
          <span className={labelClass}>{LOCALE_LABEL[loc]}</span>
          <input
            type="text"
            dir={loc === "he" ? "rtl" : "ltr"}
            required={required}
            value={value[loc]}
            onChange={(e) => onChange({ ...value, [loc]: e.target.value })}
            className={`${fieldClass} w-full`}
          />
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Formulaire (modale) de création/édition d'une prestation : libellés i18n,
 * description i18n optionnelle, cible, durée, état actif/inactif.
 */
export function PrestationForm({
  prestation,
  onClose,
  onSaved,
}: {
  prestation: Prestation | null;
  onClose: () => void;
  onSaved: (p: Prestation) => void;
}) {
  const editing = prestation !== null;
  const [libelle, setLibelle] = useState<I18nText>(prestation?.libelle ?? emptyI18n());
  const [description, setDescription] = useState<I18nText>(prestation?.description ?? emptyI18n());
  const [cible, setCible] = useState(prestation?.cible ?? typesClient[0]);
  const [dureeMinutes, setDureeMinutes] = useState(String(prestation?.dureeMinutes ?? 60));
  const [actif, setActif] = useState(prestation?.actif ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function descriptionFilled(): boolean {
    return locales.some((loc) => description[loc].trim() !== "");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const duree = Number(dureeMinutes);
    if (!Number.isInteger(duree) || duree < 1) {
      setError("La durée doit être un nombre de minutes supérieur à 0.");
      return;
    }
    if (locales.some((loc) => libelle[loc].trim() === "")) {
      setError("Le libellé est requis dans les trois langues.");
      return;
    }

    const payload: PrestationPayload = {
      libelle,
      description: descriptionFilled() ? description : null,
      cible,
      dureeMinutes: duree,
      actif,
    };

    setSubmitting(true);
    try {
      const saved = editing
        ? await updatePrestation(prestation.id, payload)
        : await createPrestation(payload);
      onSaved(saved);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 0
          ? "Connexion impossible. Réessayez."
          : "Enregistrement impossible.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title={editing ? "Modifier la prestation" : "Nouvelle prestation"} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <I18nField legend="Libellé" value={libelle} onChange={setLibelle} required />
        <I18nField
          legend="Description (optionnelle)"
          value={description}
          onChange={setDescription}
        />

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Cible</span>
            <select
              value={cible}
              onChange={(e) => setCible(e.target.value as typeof cible)}
              className={fieldClass}
            >
              {typesClient.map((t) => (
                <option key={t} value={t}>
                  {typeClientLabel[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>Durée (minutes)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={dureeMinutes}
              onChange={(e) => setDureeMinutes(e.target.value)}
              className={`${fieldClass} w-32`}
            />
          </label>

          <label className="flex items-center gap-2 self-end pb-1.5">
            <input
              type="checkbox"
              checked={actif}
              onChange={(e) => setActif(e.target.checked)}
              className="size-4 accent-or-profond"
            />
            <span className="font-ui text-sm text-encre">Active</span>
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-sm border border-statut-annule/40 bg-statut-annule-pale px-3 py-2 font-ui text-sm text-statut-annule"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-sable pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
