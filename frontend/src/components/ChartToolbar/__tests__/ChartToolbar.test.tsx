import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChartToolbar from '../ChartToolbar';

const TOOLS = [
  { type: 'line' as const, icon: '✏️', label: 'Línea' },
  { type: 'rect' as const, icon: '▭', label: 'Rectángulo' },
  { type: 'erase' as const, icon: '🗑', label: 'Borrar trazo' },
];

describe('ChartToolbar (CMP-008)', () => {
  afterEach(cleanup);

  it('renders the tools as a labelled toolbar with the active one pressed', () => {
    render(<ChartToolbar tools={TOOLS} active="line" onTool={() => {}} onZoomFit={() => {}} />);

    expect(screen.getByRole('toolbar', { name: 'Herramientas del gráfico' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Línea' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Rectángulo' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('selects a tool', () => {
    const onTool = vi.fn();
    render(<ChartToolbar tools={TOOLS} active="line" onTool={onTool} onZoomFit={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rectángulo' }));

    expect(onTool).toHaveBeenCalledWith('rect');
  });

  it('fits the view when the zoom-fit action is pressed', () => {
    const onZoomFit = vi.fn();
    render(<ChartToolbar tools={TOOLS} active="line" onTool={() => {}} onZoomFit={onZoomFit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ajustar vista' }));

    expect(onZoomFit).toHaveBeenCalledTimes(1);
  });

  it('renders undo/redo disabled when there is no history', () => {
    render(
      <ChartToolbar
        tools={TOOLS}
        active="line"
        onTool={() => {}}
        onZoomFit={() => {}}
        canUndo={false}
        canRedo={false}
      />,
    );

    expect(
      (screen.getByRole('button', { name: 'Deshacer' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Rehacer' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('invokes undo and redo when enabled', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <ChartToolbar
        tools={TOOLS}
        active="line"
        onTool={() => {}}
        onZoomFit={() => {}}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo
        canRedo
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rehacer' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('disables every action when requested', () => {
    render(
      <ChartToolbar tools={TOOLS} active="line" onTool={() => {}} onZoomFit={() => {}} disabled />,
    );

    expect(
      (screen.getByRole('button', { name: 'Ajustar vista' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByRole('button', { name: 'Línea' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
