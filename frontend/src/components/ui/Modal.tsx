import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import './Modal.css';

/** Props del modal (CMP-014, `components.md`). */
export interface ModalProps {
  /** Controla la visibilidad. */
  open: boolean;
  /** Título visible; recibe el foco inicial y nombra el diálogo. */
  title: string;
  /** Contenido del modal. */
  children: ReactNode;
  /** Cierra el modal (Escape, botón, overlay). */
  onClose: () => void;
  /** Estado de carga (aria-busy). */
  loading?: boolean;
  /** Acciones al pie (opcional). */
  footer?: ReactNode;
}

/** Selector de elementos enfocables dentro del diálogo. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Devuelve los elementos enfocables del contenedor, en orden DOM. */
function getFocusable(container: HTMLElement | null): HTMLElement[] {
  if (container === null) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Modal accesible (CMP-014).
 *
 * Implementa focus trap (Tab/Shift+Tab cicla dentro), foco inicial al título,
 * cierre con Escape y restauración del foco al cerrar (WCAG 2.4.3). Estados
 * open/closed/loading de `components.md`.
 */
export default function Modal({
  open,
  title,
  children,
  onClose,
  loading = false,
  footer,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, [open]);

  /** Maneja Escape (cierre) y Tab (trap de foco). */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = getFocusable(dialogRef.current);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading ? true : undefined}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header className="modal__header">
          <h2 className="modal__title" id={titleId} ref={titleRef} tabIndex={-1}>
            {title}
          </h2>
          <button type="button" className="modal__close" aria-label="Cerrar" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer !== undefined && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
