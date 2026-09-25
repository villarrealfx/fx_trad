import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AssetList from '../AssetList';
import type { AssetRow } from '../../../services/assets';

function row(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    symbol: 'EURUSD',
    type: 'forex',
    coverage_start: 0,
    coverage_end: 0,
    status: 'completo',
    ...overrides,
  };
}

describe('AssetList (TASK-UI-010, CMP-006)', () => {
  afterEach(() => cleanup());

  it('renders the semantic table with coverage and status', () => {
    render(<AssetList rows={[row(), row({ symbol: 'XAUUSD', status: 'parcial' })]} />);

    expect(screen.getByRole('columnheader', { name: 'Activo' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Cobertura' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeTruthy();
    expect(screen.getAllByText('1970-01-01 → 1970-01-01')).toHaveLength(2);
    expect(screen.getByText('completo')).toBeTruthy();
    expect(screen.getByText('parcial')).toBeTruthy();
  });

  it('shows a loading skeleton instead of the table', () => {
    render(<AssetList rows={[]} loading />);

    expect(screen.getByRole('status').textContent).toContain('Cargando activos');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('shows the empty CTA and triggers it', () => {
    const onDownloadFirst = vi.fn();
    render(<AssetList rows={[]} onDownloadFirst={onDownloadFirst} />);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar mi primer activo' }));

    expect(onDownloadFirst).toHaveBeenCalledTimes(1);
  });

  it('passes the symbol to onGraph from the row action', () => {
    const onGraph = vi.fn();
    render(<AssetList rows={[row({ symbol: 'XAUUSD' })]} onGraph={onGraph} />);

    fireEvent.click(screen.getByRole('button', { name: 'Graficar' }));

    expect(onGraph).toHaveBeenCalledWith('XAUUSD');
  });

  it('offers the incremental update action', () => {
    const onUpdate = vi.fn();
    render(<AssetList rows={[row()]} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar activos' }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});
