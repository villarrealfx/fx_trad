import { describe, expect, it } from 'vitest';
import * as ui from '../index';

describe('ui barrel (TASK-UI-001)', () => {
  it('exposes every form primitive', () => {
    expect(ui.Button).toBeTypeOf('function');
    expect(ui.Input).toBeTypeOf('function');
    expect(ui.Select).toBeTypeOf('function');
    expect(ui.RadioGroup).toBeTypeOf('function');
    expect(ui.DateRange).toBeTypeOf('function');
    expect(ui.StatusBanner).toBeTypeOf('function');
    expect(ui.ProgressBar).toBeTypeOf('function');
    expect(ui.Toast).toBeTypeOf('function');
    expect(ui.Modal).toBeTypeOf('function');
    expect(ui.Tab).toBeTypeOf('function');
  });
});
