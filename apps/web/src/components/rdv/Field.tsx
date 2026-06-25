import type { ReactNode } from "react";

type BaseProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Suffixe « (optionnel) » affiché à côté du label. */
  optionalHint?: string;
  /** Message d'erreur de validation (rend le champ invalide). */
  error?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  type?: "text" | "email" | "tel" | "number";
  min?: number;
  /** Rend une zone de texte multi-lignes plutôt qu'un input. */
  multiline?: boolean;
};

const fieldClasses =
  "mt-2 w-full border bg-ivoire px-4 py-3 font-body text-encre " +
  "placeholder:text-encre/35 transition-colors focus:border-or";

/**
 * Champ de formulaire du funnel, fidèle à la charte (surfaces ivoire, filets
 * encre, focus or). Gère label, marqueur optionnel, état d'erreur accessible
 * (aria-invalid + aria-describedby) — input ou textarea.
 */
export function Field(props: BaseProps): ReactNode {
  const {
    id,
    label,
    value,
    onChange,
    required,
    optionalHint,
    error,
    placeholder,
    autoComplete,
    inputMode,
    type = "text",
    min,
    multiline,
  } = props;
  const errorId = `${id}-error`;
  const borderClass = error ? "border-red-700/60" : "border-encre/20";

  return (
    <div>
      <label htmlFor={id} className="font-label text-xs uppercase tracking-[0.2em] text-encre/70">
        {label}
        {!required && optionalHint ? (
          <span className="ml-2 normal-case tracking-normal text-encre/40">{optionalHint}</span>
        ) : null}
      </label>

      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder={placeholder}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${fieldClasses} ${borderClass} resize-y`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          min={min}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${fieldClasses} ${borderClass}`}
        />
      )}

      {error ? (
        <p id={errorId} className="mt-1.5 font-label text-xs tracking-wide text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
