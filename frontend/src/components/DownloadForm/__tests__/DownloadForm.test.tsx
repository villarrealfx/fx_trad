import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DownloadForm from '../DownloadForm';

const downloadMocks = vi.hoisted(() => ({ requestDownload: vi.fn() }));

vi.mock('../../../services/downloads', () => ({
  requestDownload: downloadMocks.requestDownload,
  DownloadError: class extends Error {},
}));

const REFERENCE = '2026-09-24';

function fillRange(start: string, end: string): void {
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: end } });
}

describe('DownloadForm (SCR-002)', () => {
  beforeEach(() => {
    downloadMocks.requestDownload.mockResolvedValue({ task_id: 'task-9' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the labeled fields, the fixed UTC note and the submit button', () => {
    render(<DownloadForm referenceDate={REFERENCE} />);

    expect(screen.getByLabelText('Tipo')).toBeTruthy();
    expect(screen.getByLabelText('Activo')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de inicio')).toBeTruthy();
    expect(screen.getByLabelText('Fecha de fin')).toBeTruthy();
    expect(screen.getByText(/1 minuto \(UTC\)/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar descarga' })).toBeTruthy();
  });

  it('changes the asset options with the type', () => {
    render(<DownloadForm referenceDate={REFERENCE} />);

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'metal' } });

    expect(screen.getByRole('option', { name: 'XAUUSD' })).toBeTruthy();
  });

  it('keeps submit disabled until the range is complete', () => {
    render(<DownloadForm referenceDate={REFERENCE} />);
    const button = screen.getByRole('button', { name: 'Iniciar descarga' }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    fillRange('2026-01-01', '2026-08-31');
    expect(button.disabled).toBe(false);
  });

  it('enqueues the download in UTC seconds and notifies the queued task', async () => {
    const onQueued = vi.fn();
    render(<DownloadForm referenceDate={REFERENCE} onQueued={onQueued} />);
    fillRange('2026-01-01', '2026-01-02');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar descarga' }));

    const start = Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000);
    const end = Math.floor(Date.parse('2026-01-02T23:59:59Z') / 1000);
    await waitFor(() => expect(onQueued).toHaveBeenCalledTimes(1));
    expect(downloadMocks.requestDownload).toHaveBeenCalledWith({ asset: 'EURUSD', start, end });
    expect(onQueued).toHaveBeenCalledWith({ taskId: 'task-9', asset: 'EURUSD', start, end });
  });

  it('applies the prefill of a partial download range (RF-006)', () => {
    render(
      <DownloadForm
        referenceDate={REFERENCE}
        prefill={{ asset: 'XAUUSD', start: '2026-02-01', end: '2026-03-01' }}
      />,
    );

    expect((screen.getByLabelText('Tipo') as HTMLSelectElement).value).toBe('metal');
    expect((screen.getByLabelText('Activo') as HTMLSelectElement).value).toBe('XAUUSD');
    expect((screen.getByLabelText('Fecha de inicio') as HTMLInputElement).value).toBe('2026-02-01');
    expect((screen.getByLabelText('Fecha de fin') as HTMLInputElement).value).toBe('2026-03-01');
  });

  it('disables the fields and the submit while a download is in progress', () => {
    const { container } = render(<DownloadForm referenceDate={REFERENCE} disabled />);

    expect(container.querySelector('.download-form__fieldset')?.hasAttribute('disabled')).toBe(
      true,
    );
    expect(
      (screen.getByRole('button', { name: 'Iniciar descarga' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('shows an error banner and preserves the values when the request fails', async () => {
    downloadMocks.requestDownload.mockRejectedValueOnce(new Error('falló la descarga'));
    render(<DownloadForm referenceDate={REFERENCE} />);
    fillRange('2026-01-01', '2026-01-02');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar descarga' }));

    expect(await screen.findByText('falló la descarga')).toBeTruthy();
    expect((screen.getByLabelText('Fecha de inicio') as HTMLInputElement).value).toBe('2026-01-01');
  });

  it('rejects a start older than two years (RNF-003)', () => {
    render(<DownloadForm referenceDate={REFERENCE} />);

    fillRange('2020-01-01', '2026-01-02');

    expect(screen.getByText(/fuera de la cobertura/)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Iniciar descarga' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
