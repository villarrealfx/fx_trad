import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StatusBanner from '../StatusBanner';

describe('StatusBanner (CMP-012)', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('announces errors as alert and success as status', () => {
    const { rerender } = render(<StatusBanner tone="error" message="La descarga falló" />);
    expect(screen.getByRole('alert').textContent).toContain('La descarga falló');

    rerender(<StatusBanner tone="success" message="Descarga completada" />);
    expect(screen.getByRole('status').textContent).toContain('Descarga completada');
  });

  it('renders and fires the optional action', () => {
    const onAction = vi.fn();
    render(
      <StatusBanner tone="error" message="Falló" actionLabel="Reintentar" onAction={onAction} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the close button is pressed', () => {
    const onClose = vi.fn();
    render(<StatusBanner tone="warning" message="Parcial" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses success banners', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<StatusBanner tone="success" message="Hecho" onClose={onClose} autoDismissMs={5000} />);

    vi.advanceTimersByTime(5000);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
