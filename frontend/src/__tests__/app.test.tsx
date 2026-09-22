import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../components/ChartPane/ChartPane', () => ({
  default: () => <div data-testid="chart-pane" aria-hidden="true" />,
}));

describe('App', () => {
  it('renders the app heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'fxtrad' })).toBeTruthy();
  });
});
