import { useTranslations } from "next-intl";

/** Clés des étapes du funnel (namespace Rdv.steps). */
export type StepKey = "service" | "details" | "slot" | "confirm";

type StepIndicatorProps = {
  /** Index de l'étape courante (0-based). */
  current: number;
  /** Clés des étapes, dans l'ordre. */
  steps: readonly StepKey[];
};

/**
 * Fil d'Ariane des 4 étapes du funnel. Numérotation gravée (registre Cinzel),
 * étape courante en or profond, étapes franchies en encre, à venir en muet.
 */
export function StepIndicator({ current, steps }: StepIndicatorProps) {
  const t = useTranslations("Rdv.steps");

  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {steps.map((key, index) => {
        const state = index === current ? "current" : index < current ? "done" : "todo";
        return (
          <li key={key} className="flex items-center gap-3">
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={[
                "flex items-center gap-2 font-label text-xs uppercase tracking-[0.18em]",
                state === "current"
                  ? "text-or-profond"
                  : state === "done"
                    ? "text-encre"
                    : "text-encre/35",
              ].join(" ")}
            >
              <span className="font-title text-sm">{String(index + 1).padStart(2, "0")}</span>
              {t(key)}
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden className="h-px w-6 bg-encre/20" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
