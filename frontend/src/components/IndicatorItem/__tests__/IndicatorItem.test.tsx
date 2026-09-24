import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IndicatorItem from '../IndicatorItem';

function setup(overrides: Partial<Parameters<typeof IndicatorItem>[0]> = {}) {
  const props = {
    id: 'ma-20',
    name: 'MA 20',
    period: 20,
    visible: true,
    configOpen: false,
    color: '#58A6FF',
    onToggleConfig: vi.fn(),
    onToggleVisible: vi.fn(),
    onPeriodChange: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(
    <ul>
      <IndicatorItem {...props} />
    </ul>,
  );
  return props;
}

describe('IndicatorItem (CMP-010)', () => {
  afterEach(cleanup);

  it('renders name, visibility and actions with the config closed', () => {
    setup();

    expect(screen.getByText('MA 20')).toBeTruthy();
    expect(screen.getByLabelText('Mostrar')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Configurar' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(screen.getByRole('button', { name: 'Quitar MA 20' })).toBeTruthy();
    expect(screen.queryByLabelText('Periodo MA 20')).toBeNull();
  });

  it('opens the configuration editor', () => {
    setup({ configOpen: true });

    expect(screen.getByLabelText('Periodo MA 20')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Configurar' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
  });

  it('reports a new period from the editor', () => {
    const { onPeriodChange } = setup({ configOpen: true });

    fireEvent.change(screen.getByLabelText('Periodo MA 20'), { target: { value: '30' } });

    expect(onPeriodChange).toHaveBeenCalledWith(30);
  });

  it('ignores invalid periods', () => {
    const { onPeriodChange } = setup({ configOpen: true });

    fireEvent.change(screen.getByLabelText('Periodo MA 20'), { target: { value: '0' } });

    expect(onPeriodChange).not.toHaveBeenCalled();
  });

  it('reports toggles and removal', () => {
    const { onToggleVisible, onToggleConfig, onRemove } = setup();

    fireEvent.click(screen.getByLabelText('Mostrar'));
    fireEvent.click(screen.getByRole('button', { name: 'Configurar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar MA 20' }));

    expect(onToggleVisible).toHaveBeenCalledTimes(1);
    expect(onToggleConfig).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
