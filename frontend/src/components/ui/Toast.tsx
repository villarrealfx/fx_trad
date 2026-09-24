import { useEffect } from 'react';
import './Toast.css';

/** Tono del toast (CMP-015). */
export type ToastTone = 'success' | 'error';

/** Props del toast (CMP-015, `components.md`). */
export interface ToastProps {
  /** Tono semántico; define color y `aria-live`. */
  tone: ToastTone;
  /** Mensaje visible (español). */
  message: string;
  /** Auto-cierre en ms (default 5000). */
  durationMs?: number;
  /** Se llama al cerrar (manual o automático). */
  onClose: () => void;
}

/**
 * Notificación transitoria (CMP-015).
 *
 * `success` se anuncia con `role="status"` (`aria-live="polite"`) y `error`
 * con `role="alert"` (`aria-live="assertive"`); se auto-cierra tras
 * `durationMs` y admite cierre manual.
 */
export default function Toast({ tone, message, durationMs = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  return (
    <div
      className={`toast toast--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast__message">{message}</span>
      <button type="button" className="toast__close" aria-label="Cerrar" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}
