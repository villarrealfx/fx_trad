import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ProgressBar from '../ProgressBar';

describe('ProgressBar (CMP-013)', () => {
  afterEach(cleanup);

  it('exposes a progressbar with the current value and range', () => {
    render(<ProgressBar percent={42} label="Descarga 1s" />);

    const bar = screen.getByRole('progressbar', { name: 'Descarga 1s' });
    expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('clamps out-of-range and invalid values', () => {
    const { rerender } = render(<ProgressBar percent={150} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');

    rerender(<ProgressBar percent={Number.NaN} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('reflects the paused and complete status', () => {
    const { container, rerender } = render(<ProgressBar percent={50} status="paused" />);
    expect(container.querySelector('.progress')?.getAttribute('data-status')).toBe('paused');

    rerender(<ProgressBar percent={100} status="complete" />);
    expect(container.querySelector('.progress')?.getAttribute('data-status')).toBe('complete');
  });
});
