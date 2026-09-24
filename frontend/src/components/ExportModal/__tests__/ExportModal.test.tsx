import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExportModal from '../ExportModal';

const exportMocks = vi.hoisted(() => ({
  exportChartPng: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock('../../../export', () => ({
  EXPORT_SCALES: [1, 2, 4],
  EXPORT_FORMATS: ['png', 'webp'],
  exportChartPng: exportMocks.exportChartPng,
  downloadBlob: exportMocks.downloadBlob,
}));

/** Canvas falso con la única API que usa el modal (preview). */
function fakeCanvas(): HTMLCanvasElement {
  return { toDataURL: () => 'data:image/png;base64,AAA' } as unknown as HTMLCanvasElement;
}

function setup(overrides: Partial<Parameters<typeof ExportModal>[0]> = {}) {
  const compose = vi.fn(() => fakeCanvas());
  const onClose = vi.fn();
  const onExported = vi.fn();
  render(
    <ExportModal
      open
      onClose={onClose}
      compose={compose}
      symbol="EURUSD"
      timeframe="1h"
      onExported={onExported}
      {...overrides}
    />,
  );
  return { compose, onClose, onExported };
}

describe('ExportModal (TASK-UI-060)', () => {
  beforeEach(() => {
    exportMocks.exportChartPng.mockResolvedValue({
      blob: new Blob(['png'], { type: 'image/png' }),
      filename: 'fxtrad-EURUSD-1h-2x.png',
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders the dialog with default resolution, format and preview', () => {
    setup();

    expect(screen.getByRole('dialog', { name: 'Exportar captura' })).toBeTruthy();
    expect((screen.getByLabelText('2x (nice)') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('PNG') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByAltText('Vista previa del gráfico EURUSD 1h')).toBeTruthy();
  });

  it('shows the empty state and disables download when there is no canvas', () => {
    setup({ compose: vi.fn(() => null) });

    expect(screen.getByText('No hay gráfico que exportar')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Descargar PNG' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('generates and downloads the PNG on success', async () => {
    const { compose, onClose, onExported } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar PNG' }));

    await waitFor(() => expect(exportMocks.exportChartPng).toHaveBeenCalledTimes(1));
    expect(exportMocks.exportChartPng).toHaveBeenCalledWith({
      canvas: expect.anything(),
      symbol: 'EURUSD',
      timeframe: '1h',
      scale: 2,
      format: 'png',
    });
    expect(compose).toHaveBeenCalledWith(2);
    expect(exportMocks.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      'fxtrad-EURUSD-1h-2x.png',
    );
    expect(onExported).toHaveBeenCalledWith('fxtrad-EURUSD-1h-2x.png');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an error state with a retry action when generation fails', async () => {
    exportMocks.exportChartPng.mockRejectedValueOnce(new Error('blob falló'));
    setup();

    fireEvent.click(screen.getByRole('button', { name: 'Descargar PNG' }));

    expect(await screen.findByText('No se pudo generar la imagen')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('shows the partial-coverage note when provided', () => {
    setup({ partialNote: 'Se excluyó el pane sin datos' });

    expect(screen.getByText('Se excluyó el pane sin datos')).toBeTruthy();
  });

  it('recomposes and exports at the chosen resolution', async () => {
    const { compose } = setup();

    fireEvent.click(screen.getByLabelText('4x (máx.)'));
    await waitFor(() => expect(compose).toHaveBeenCalledWith(4));

    fireEvent.click(screen.getByRole('button', { name: 'Descargar PNG' }));
    await waitFor(() => expect(exportMocks.exportChartPng).toHaveBeenCalledTimes(1));
    expect(exportMocks.exportChartPng).toHaveBeenCalledWith(expect.objectContaining({ scale: 4 }));
  });

  it('exports with the selected format', async () => {
    setup();

    fireEvent.click(screen.getByLabelText('WebP'));
    fireEvent.click(screen.getByRole('button', { name: 'Descargar WebP' }));

    await waitFor(() => expect(exportMocks.exportChartPng).toHaveBeenCalledTimes(1));
    expect(exportMocks.exportChartPng).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'webp' }),
    );
  });
});
