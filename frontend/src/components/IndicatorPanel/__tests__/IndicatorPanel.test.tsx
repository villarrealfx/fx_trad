import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_INDICATOR_CONFIGS,
  toIndicatorParameters,
  type IndicatorConfig,
} from '../../../indicators/config';
import IndicatorPanel from '../IndicatorPanel';

describe('IndicatorPanel (CMP-010)', () => {
  afterEach(cleanup);

  it('shows the default indicators (J-004)', () => {
    render(<IndicatorPanel configs={DEFAULT_INDICATOR_CONFIGS} onChange={() => {}} />);

    expect(screen.getByText('MA 20')).toBeTruthy();
    expect(screen.getByText('MA 50')).toBeTruthy();
    expect(screen.getByText('MA 200')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar ATR' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar RSI' })).toBeTruthy();
  });

  it('removes an indicator', () => {
    const onChange = vi.fn();
    render(<IndicatorPanel configs={DEFAULT_INDICATOR_CONFIGS} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quitar MA 20' }));

    const next = onChange.mock.calls[0][0] as IndicatorConfig[];
    expect(next.some((config) => config.id === 'ma-20')).toBe(false);
  });

  it('toggles the visibility of an indicator', () => {
    const onChange = vi.fn();
    render(<IndicatorPanel configs={DEFAULT_INDICATOR_CONFIGS} onChange={onChange} />);

    fireEvent.click(screen.getAllByLabelText('Mostrar')[0]);

    const next = onChange.mock.calls[0][0] as IndicatorConfig[];
    expect(next[0].visible).toBe(false);
  });

  it('reconfigures the period through the editor', () => {
    const onChange = vi.fn();
    render(<IndicatorPanel configs={DEFAULT_INDICATOR_CONFIGS} onChange={onChange} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Configurar' })[0]);
    fireEvent.change(screen.getByLabelText('Periodo MA 20'), { target: { value: '30' } });

    const next = onChange.mock.calls.at(-1)?.[0] as IndicatorConfig[];
    expect(next[0].period).toBe(30);
  });

  it('adds a new indicator of the selected kind', () => {
    const onChange = vi.fn();
    render(<IndicatorPanel configs={DEFAULT_INDICATOR_CONFIGS} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));

    const next = onChange.mock.calls[0][0] as IndicatorConfig[];
    expect(next).toHaveLength(DEFAULT_INDICATOR_CONFIGS.length + 1);
    expect(next.at(-1)?.kind).toBe('MA');
  });
});

describe('toIndicatorParameters (TASK-UI-042)', () => {
  it('maps visible MA items and hidden RSI/ATR to the ChartPane parameters', () => {
    const configs: IndicatorConfig[] = [
      { id: 'ma-20', kind: 'MA', period: 20, visible: true },
      { id: 'ma-50', kind: 'MA', period: 50, visible: false },
      { id: 'rsi-14', kind: 'RSI', period: 14, visible: false },
      { id: 'atr-14', kind: 'ATR', period: 14, visible: true },
    ];

    const params = toIndicatorParameters(configs);

    expect(params.maPeriods).toEqual([20]);
    expect(params.rsiPeriod).toBe(14);
    expect(params.atrPeriod).toBe(14);
    expect(params.showRsi).toBe(false);
    expect(params.showAtr).toBe(true);
  });
});
