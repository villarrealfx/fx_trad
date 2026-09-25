import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DownloadHistory from '../DownloadHistory';
import type { DownloadHistoryEntry } from '../../../services/downloads';

function entry(overrides: Partial<DownloadHistoryEntry> = {}): DownloadHistoryEntry {
  return {
    date: '2026-08-18T12:00:00Z',
    active: 'EURUSD',
    range: { start: 0, end: 0 },
    status: 'exito',
    rows: 87421,
    ...overrides,
  };
}

describe('DownloadHistory (TASK-UI-021, RI-002)', () => {
  afterEach(() => cleanup());

  it('hides the block when there is no history (empty state)', () => {
    const { container } = render(<DownloadHistory entries={[]} />);

    expect(container.querySelector('.download-history')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders date, range, status and rows of each download', () => {
    render(
      <DownloadHistory
        entries={[
          entry({ status: 'exito', rows: 87421 }),
          entry({ status: 'fallo', rows: 0, range: { start: 60, end: 120 } }),
        ]}
      />,
    );

    expect(screen.getAllByText('18-08-2026')).toHaveLength(2);
    expect(screen.getAllByText('1970-01-01 → 1970-01-01')).toHaveLength(2);
    expect(screen.getByText('éxito')).toBeTruthy();
    expect(screen.getByText('fallo')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    const history = screen.getByRole('table').textContent ?? '';
    expect(history.replace(/[^0-9]/g, '')).toContain('87421');
  });

  it('suggests the pending range for a partial download and lets the user complete it', () => {
    const onCompleteRange = vi.fn();
    render(
      <DownloadHistory
        entries={[entry({ status: 'parcial', range: { start: 0, end: 86400 } })]}
        onCompleteRange={onCompleteRange}
      />,
    );

    expect(screen.getByText(/Falta completar/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Completar rango' }));

    expect(onCompleteRange).toHaveBeenCalledWith(
      entry({ status: 'parcial', range: { start: 0, end: 86400 } }),
    );
  });

  it('does not offer the completion action without a handler', () => {
    render(<DownloadHistory entries={[entry({ status: 'parcial' })]} />);

    expect(screen.getByText('parcial')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Completar rango' })).toBeNull();
  });
});
