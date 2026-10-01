import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DrawTool from '../DrawTool';

describe('DrawTool (CMP-009)', () => {
  afterEach(cleanup);

  it('renders an icon-only tool with accessible name and tooltip', () => {
    render(<DrawTool type="line" icon="✏️" ariaLabel="Línea" active={false} onSelect={() => {}} />);

    const button = screen.getByRole('button', { name: 'Línea' });
    expect(button.getAttribute('title')).toBe('Línea');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('marks the active tool with aria-pressed', () => {
    render(<DrawTool type="fib" icon="Φ" ariaLabel="Fibonacci" active onSelect={() => {}} />);

    expect(screen.getByRole('button', { name: 'Fibonacci' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('renders the operation tool with its two-click hint (RF-310)', () => {
    const ariaLabel = 'Operación: 2 clics (Entrada, SL)';
    render(
      <DrawTool
        type="operation"
        icon="◎"
        ariaLabel={ariaLabel}
        active={false}
        onSelect={() => {}}
      />,
    );

    const button = screen.getByRole('button', { name: ariaLabel });
    expect(button.getAttribute('title')).toBe(ariaLabel);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('reports the selected tool', () => {
    const onSelect = vi.fn();
    render(
      <DrawTool type="rect" icon="▭" ariaLabel="Rectángulo" active={false} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rectángulo' }));

    expect(onSelect).toHaveBeenCalledWith('rect');
  });

  it('can be disabled', () => {
    render(
      <DrawTool
        type="erase"
        icon="🗑"
        ariaLabel="Borrar trazo"
        active={false}
        onSelect={() => {}}
        disabled
      />,
    );

    expect(
      (screen.getByRole('button', { name: 'Borrar trazo' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
