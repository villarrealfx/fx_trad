import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../components/ChartPane/ChartPane', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef(function MockChartPane(_props: unknown, ref: unknown) {
      React.useImperativeHandle(ref as never, () => ({
        compose: () => document.createElement('canvas'),
      }));
      return <div data-testid="chart-pane" aria-hidden="true" />;
    }),
  };
});

vi.mock('../components/IndicatorPanel/IndicatorPanel', () => ({
  default: () => <div data-testid="indicator-panel" />,
}));

describe('App', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the app heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'fxtrad' })).toBeTruthy();
  });

  it('shows the composed canvas in the dev preview when verifying (TASK-035)', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Verificar composición (dev)' }));

    const preview = screen.getByTestId('composition-preview');
    expect(preview.querySelector('canvas')).not.toBeNull();
  });
});
