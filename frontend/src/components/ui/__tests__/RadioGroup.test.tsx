import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RadioGroup from '../RadioGroup';

const OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
];

describe('RadioGroup (CMP-004)', () => {
  afterEach(cleanup);

  it('groups the radios under a visible legend', () => {
    render(
      <RadioGroup
        name="formato"
        legend="Formato"
        options={OPTIONS}
        value="png"
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('group', { name: 'Formato' })).toBeTruthy();
    expect((screen.getByLabelText('PNG') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('WebP') as HTMLInputElement).checked).toBe(false);
  });

  it('reports the selected option', () => {
    const onChange = vi.fn();
    render(
      <RadioGroup
        name="formato"
        legend="Formato"
        options={OPTIONS}
        value="png"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('WebP'));

    expect(onChange).toHaveBeenCalledWith('webp');
  });

  it('uses the group name as accessible name when no legend is provided', () => {
    render(<RadioGroup name="formato" options={OPTIONS} value="png" onChange={() => {}} />);

    expect(screen.getByRole('group', { name: 'formato' })).toBeTruthy();
  });

  it('disables every option when requested', () => {
    render(
      <RadioGroup
        name="formato"
        legend="Formato"
        options={OPTIONS}
        value="png"
        onChange={() => {}}
        disabled
      />,
    );

    expect((screen.getByLabelText('PNG') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('WebP') as HTMLInputElement).disabled).toBe(true);
  });
});
