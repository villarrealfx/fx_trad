import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Modal from '../Modal';

describe('Modal (CMP-014)', () => {
  afterEach(cleanup);

  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} title="Exportar captura" onClose={() => {}}>
        contenido
      </Modal>,
    );

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('focuses the title on open and restores focus on close', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { rerender } = render(
      <Modal open title="Exportar captura" onClose={() => {}}>
        contenido
      </Modal>,
    );

    const heading = screen.getByRole('heading', { name: 'Exportar captura' });
    expect(document.activeElement).toBe(heading);

    rerender(
      <Modal open={false} title="Exportar captura" onClose={() => {}}>
        contenido
      </Modal>,
    );
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Exportar captura" onClose={onClose}>
        contenido
      </Modal>,
    );

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab focus inside the dialog', () => {
    render(
      <Modal open title="Exportar captura" onClose={() => {}} footer={<button>Descargar</button>}>
        contenido
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: 'Cerrar' });
    const download = screen.getByRole('button', { name: 'Descargar' });

    download.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(download);
  });

  it('exposes the loading state with aria-busy', () => {
    render(
      <Modal open loading title="Exportar captura" onClose={() => {}}>
        contenido
      </Modal>,
    );

    expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
  });

  it('closes on overlay click but not on dialog click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open title="Exportar captura" onClose={onClose}>
        contenido
      </Modal>,
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('.modal-overlay') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles Tab when there are no focusable elements', () => {
    render(
      <Modal open title="Solo texto" onClose={() => {}}>
        contenido
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    screen.getByRole('button', { name: 'Cerrar' }).remove();

    fireEvent.keyDown(dialog, { key: 'Tab' });

    expect(document.activeElement).not.toBeNull();
  });
});
