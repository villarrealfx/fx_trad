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
    render(<ChartToolbar tools={TOOLS} active="line" onTool={() => {}} />);

    expect(screen.getByRole('toolbar', { name: 'Herramientas del gráfico' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Línea' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Rectángulo' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('selects a tool', () => {
    const onTool = vi.fn();
    render(<ChartToolbar tools={TOOLS} active="line" onTool={onTool} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rectángulo' }));

    expect(onTool).toHaveBeenCalledWith('rect');
  });

  it('renders undo/redo disabled when there is no history', () => {
    render(
      <ChartToolbar
        tools={TOOLS}
        active="line"
        onTool={() => {}}
        canUndo={false}
        canRedo={false}
      />,
    );

    expect((screen.getByRole('button', { name: 'Deshacer' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: 'Rehacer' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('invokes undo and redo when enabled', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <ChartToolbar
        tools={TOOLS}
        active="line"
        onTool={() => {}}
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
    render(<ChartToolbar tools={TOOLS} active="line" onTool={() => {}} disabled />);

    expect((screen.getByRole('button', { name: 'Línea' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: 'Deshacer' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
