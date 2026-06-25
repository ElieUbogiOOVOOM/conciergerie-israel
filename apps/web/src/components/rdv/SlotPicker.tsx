"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale, Slot } from "@hymea/shared";
import { fetchSlots } from "@/lib/api";
import { formatLongDate, formatSlotTime } from "@/lib/datetime";
import { Calendar } from "./Calendar";

type SlotPickerProps = {
  prestationId: string;
  /** Instant ISO du créneau retenu (null si aucun). */
  selectedDebut: string | null;
  onSelect: (debut: string) => void;
};

/**
 * Étape « Créneau » : un calendrier choisit la date, puis l'API renvoie les
 * créneaux réellement libres (durée calée sur la prestation). Les horaires sont
 * affichés à l'heure d'Israël, fuseau d'opération du service.
 */
export function SlotPicker({ prestationId, selectedDebut, onSelect }: SlotPickerProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Rdv.slot");
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function loadSlots(iso: string) {
    setSlots([]);
    setStatus("loading");
    try {
      const result = await fetchSlots(iso, prestationId);
      setSlots(result.slots);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function onPickDate(iso: string) {
    setDate(iso);
    void loadSlots(iso);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
      <Calendar selected={date} onSelect={onPickDate} />

      <div aria-live="polite" className="min-w-0">
        {!date ? (
          <p className="text-[length:var(--text-lead)] text-encre/60">{t("pickDate")}</p>
        ) : (
          <>
            <p className="font-label text-xs uppercase tracking-[0.2em] text-or-profond">
              {formatLongDate(date, locale)}
            </p>

            {status === "loading" ? <p className="mt-4 text-encre/60">{t("loading")}</p> : null}

            {status === "error" ? (
              <div className="mt-4">
                <p className="text-encre/70">{t("error")}</p>
                <button
                  type="button"
                  onClick={() => date && loadSlots(date)}
                  className="mt-3 border border-encre/25 px-5 py-2 font-label text-xs uppercase tracking-widest text-encre transition-colors hover:border-or hover:text-or-profond"
                >
                  {t("retry")}
                </button>
              </div>
            ) : null}

            {status === "idle" && slots.length === 0 ? (
              <p className="mt-4 text-encre/70">{t("empty")}</p>
            ) : null}

            {slots.length > 0 ? (
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((slot) => {
                  const isSelected = slot.debut === selectedDebut;
                  return (
                    <li key={slot.debut}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => onSelect(slot.debut)}
                        className={[
                          "w-full border px-3 py-2 font-label text-sm transition-colors",
                          isSelected
                            ? "border-or bg-or text-ivoire"
                            : "border-encre/20 text-encre hover:border-or hover:text-or-profond",
                        ].join(" ")}
                      >
                        <bdi>{formatSlotTime(slot.debut, locale)}</bdi>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <p className="mt-6 font-label text-xs uppercase tracking-wider text-encre/45">
              {t("timezoneNote")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
