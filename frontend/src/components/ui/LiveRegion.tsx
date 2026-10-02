/**
 * Región live reutilizable (CMP-020, TASK-UI-201, ACC-201).
 *
 * Anuncia cambios de estado a lectores de pantalla sin ocupar espacio visual
 * (`class="sr-only"`). Centraliza el patrón `aria-live` que antes se repetía
 * inline en cada componente (SCR-002, SCR-004).
 */

/** Urgencia del anuncio (mapea a `role`/`aria-live`). */
export type LiveTone = 'polite' | 'assertive';

/** Props de la región live (CMP-020, `components.md`). */
export interface LiveRegionProps {
  /** Mensaje a anunciar (español). */
  message: string;
  /** Urgencia: `polite` (por defecto) o `assertive`. */
  tone?: LiveTone;
  /** Anuncia el contenido completo en cada cambio (por defecto `true`). */
  atomic?: boolean;
}

/**
 * Región `aria-live` visually-hidden (CMP-020).
 *
 * `assertive` se expone como `alert` (errores) y `polite` como `status`
 * (progreso, estados). El texto es el único contenido: no interactúa con foco.
 */
export default function LiveRegion({ message, tone = 'polite', atomic = true }: LiveRegionProps) {
  return (
    <div
      className="sr-only"
      role={tone === 'assertive' ? 'alert' : 'status'}
      aria-live={tone}
      aria-atomic={atomic}
      data-tone={tone}
    >
      {message}
    </div>
  );
}
