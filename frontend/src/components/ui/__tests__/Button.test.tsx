import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Button from '../Button';

describe('Button (CMP-001)', () => {
  afterEach(cleanup);

  it('renders the visible label with the primary variant by default', () => {
    render(<Button label="Descargar" />);

    const button = screen.getByRole('button', { name: 'Descargar' });
    expect(button.className).toContain('btn--primary');
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    render(<Button label="Enviar" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled, busy and shows a spinner while loading', () => {
    render(<Button label="Enviando" loading />);

    const button = screen.getByRole('button', { name: 'Enviando' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('exposes an accessible name and tooltip for icon-only buttons', () => {
    render(
      <Button label="Borrar" variant="icon" ariaLabel="Borrar marcador" icon={<span>✕</span>} />,
    );

    const button = screen.getByRole('button', { name: 'Borrar marcador' });
    expect(button.getAttribute('title')).toBe('Borrar marcador');
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button label="Enviar" onClick={onClick} disabled />);

    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
