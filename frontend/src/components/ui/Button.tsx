import type { ReactNode } from 'react';
import './Button.css';

/** Variantes visuales del botón (CMP-001). */
export type ButtonVariant = 'primary' | 'ghost' | 'icon';

/** Props del botón base (CMP-001, `components.md`). */
export interface ButtonProps {
  /** Texto visible; en variante `icon` actúa como nombre accesible por defecto. */
  label: string;
  /** Acción al pulsar (no se dispara si `disabled` o `loading`). */
  onClick?: () => void;
  /** Variante visual (default `primary`). */
  variant?: ButtonVariant;
  /** Deshabilita la interacción. */
  disabled?: boolean;
  /** Muestra spinner, marca `aria-busy` y deshabilita. */
  loading?: boolean;
  /** Nombre accesible explícito (obligatorio en icon-only). */
  ariaLabel?: string;
  /** Tooltip nativo (recomendado en icon-only). */
  title?: string;
  /** Tipo de botón (default `button`, evita submits accidentales). */
  type?: 'button' | 'submit';
  /** Ícono opcional (Lucide u otro, decorativo junto al label). */
  icon?: ReactNode;
}

/**
 * Botón base reutilizable (CMP-001).
 *
 * Cubre los estados default/hover/focus/active/disabled/loading de
 * `components.md`; el hover/active son de CSS y el loading se expone con
 * `aria-busy`. Nunca se usa sin label visible o `aria-label` (a11y 4.1.2).
 */
export default function Button({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  ariaLabel,
  title,
  type = 'button',
  icon,
}: ButtonProps) {
  const isIcon = variant === 'icon';
  const accessibleName = isIcon ? (ariaLabel ?? label) : ariaLabel;
  return (
    <button
      type={type}
      className={`btn btn--${variant}`}
      disabled={disabled || loading}
      aria-busy={loading ? true : undefined}
      aria-label={accessibleName}
      title={isIcon ? (title ?? accessibleName) : title}
      onClick={onClick}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      {isIcon ? (
        loading ? null : (
          icon
        )
      ) : (
        <>
          {icon}
          <span className="btn__label">{label}</span>
        </>
      )}
    </button>
  );
}
