import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_INDICATOR_PARAMETERS } from '../../indicators/indicators';
import type { IndicatorParameters } from '../../indicators/indicators';
import IndicatorPanel from './IndicatorPanel';

describe('IndicatorPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the default periods visibly (J-004)', () => {
    render(<IndicatorPanel params={DEFAULT_INDICATOR_PARAMETERS} onChange={() => {}} />);
    expect((screen.getByLabelText('MA 20') as HTMLInputElement).value).toBe('20');
    expect((screen.getByLabelText('MA 50') as HTMLInputElement).value).toBe('50');
    expect((screen.getByLabelText('MA 200') as HTMLInputElement).value).toBe('200');
    expect((screen.getByLabelText('RSI') as HTMLInputElement).value).toBe('14');
    expect((screen.getByLabelText('ATR') as HTMLInputElement).value).toBe('14');
    expect(screen.getByRole('region', { name: 'Indicadores' })).toBeTruthy();
  });

  it('reports a new MA period preserving RSI and ATR', () => {
    const onChange = vi.fn();
    render(<IndicatorPanel params={DEFAULT_INDICATOR_PARAMETERS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('MA 20'), { target: { value: '25' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as IndicatorParameters;
    expect([...next.maPeriods]).toEqual([25, 50, 200]);
    expect(next.rsiPeriod).toBe(14);
    expect(next.atrPeriod).toBe(14);
  });

  it('updates the RSI period preserving the rest', () => {
    const onChange = vi.fn();
    render(<IndicatorPanel params={DEFAULT_INDICATOR_PARAMETERS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('RSI'), { target: { value: '9' } });
    const next = onChange.mock.calls[0]?.[0] as IndicatorParameters;
    expect(next.rsiPeriod).toBe(9);
    expect([...next.maPeriods]).toEqual([20, 50, 200]);
    expect(next.atrPeriod).toBe(14);
  });

  it('ignores non-positive or non-numeric periods', () => {
    const onChange = vi.fn();
    render(<IndicatorPanel params={DEFAULT_INDICATOR_PARAMETERS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('MA 50'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('ATR'), { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
