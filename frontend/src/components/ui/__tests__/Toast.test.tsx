import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Toast from '../Toast';

describe('Toast (CMP-015)', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('uses role status for success and alert for error', () => {
    const { rerender } = render(
      <Toast tone="success" message="PNG descargado" onClose={() => {}} />,
    );
    expect(screen.getByRole('status').textContent).toContain('PNG descargado');

    rerender(<Toast tone="error" message="No se pudo exportar" onClose={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('No se pudo exportar');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
  });

  it('auto-dismisses after the duration', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast tone="success" message="ok" durationMs={3000} onClose={onClose} />);

    vi.advanceTimersByTime(3000);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes manually', () => {
    const onClose = vi.fn();
    render(<Toast tone="error" message="Fallo" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
