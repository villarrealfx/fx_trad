import { useEffect } from 'react';
import './StatusBanner.css';

/** Tono del banner (CMP-012). */
export type BannerTone = 'success' | 'error' | 'warning';

/** Props del banner de estado (CMP-012, `components.md`). */
export interface StatusBannerProps {
  /** Tono semántico; define el color y el rol ARIA. */
  tone: BannerTone;
  /** Mensaje visible (español). */
  message: string;
  /** Etiqueta de la acción opcional. */
  actionLabel?: string;
  /** Acción al pulsar el botón opcional. */
  onAction?: () => void;
  /** Si se define, muestra botón de cierre y se llama al cerrar. */
  onClose?: () => void;
  /** Auto-cierre en ms (solo éxito, SCR-002); requiere `onClose`. */
  autoDismissMs?: number;
}

/**
 * Banner de estado inline (CMP-012).
 *
 * `error` se anuncia como `alert`; `success`/`warning` como `status`
 * (a11y `aria-live`). El éxito admite auto-cierre (SCR-002).
 */
export default function StatusBanner({
  tone,
  message,
  actionLabel,
  onAction,
  onClose,
  autoDismissMs,
}: StatusBannerProps) {
  const autoDismiss = tone === 'success' && autoDismissMs !== undefined && onClose !== undefined;
  useEffect(() => {
    if (!autoDismiss) return;
    const timer = setTimeout(() => onClose?.(), autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismiss, autoDismissMs, onClose]);

  return (
    <div
      className={`banner banner--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      data-tone={tone}
    >
      <p className="banner__message">{message}</p>
      {actionLabel !== undefined && onAction !== undefined && (
        <button type="button" className="banner__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
      {onClose !== undefined && (
        <button type="button" className="banner__close" aria-label="Cerrar" onClick={onClose}>
          ✕
        </button>
      )}
    </div>
  );
}
