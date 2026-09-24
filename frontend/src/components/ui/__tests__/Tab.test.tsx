import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Tab from '../Tab';

const TABS = [
  { id: '1h', label: 'EURUSD · 1H' },
  { id: '5m', label: 'EURUSD · 5M' },
  { id: '1d', label: 'XAUUSD · 1D', disabled: true },
];

describe('Tab (CMP-011)', () => {
  afterEach(cleanup);

  it('renders the tablist with the active tab selected', () => {
    render(<Tab tabs={TABS} active="1h" onChange={() => {}} />);

    expect(screen.getByRole('tablist', { name: 'Gráficos' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'EURUSD · 1H' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: 'EURUSD · 5M' }).getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('selects a tab on click', () => {
    const onChange = vi.fn();
    render(<Tab tabs={TABS} active="1h" onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'EURUSD · 5M' }));

    expect(onChange).toHaveBeenCalledWith('5m');
  });

  it('moves with arrow keys and skips disabled tabs', () => {
    const onChange = vi.fn();
    render(<Tab tabs={TABS} active="1h" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('5m');

    onChange.mockClear();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('5m');

    onChange.mockClear();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('5m');

    onChange.mockClear();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('1h');
  });

  it('adds and removes tabs when handlers are provided', () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    render(<Tab tabs={TABS} active="1h" onChange={() => {}} onAdd={onAdd} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole('button', { name: 'Añadir gráfico' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar EURUSD · 1H' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('1h');
  });
});
