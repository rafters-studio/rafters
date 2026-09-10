import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { RadioGroup, RadioGroupItem } from '../../../src/components/radio-group/radio-group';

interface SceneProps {
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  required?: boolean;
  disabledItems?: string[];
}

const OPTIONS: ReadonlyArray<[string, string]> = [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma'],
];

/** The group carries its accessible name; a radiogroup has no text of its own. */
function Scene({ disabledItems = [], ...props }: SceneProps) {
  return (
    <RadioGroup aria-label="Choose one" {...props}>
      {OPTIONS.map(([value, label]) => (
        <RadioGroupItem key={value} value={value} disabled={disabledItems.includes(value)}>
          {label}
        </RadioGroupItem>
      ))}
    </RadioGroup>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['nothing selected', {}],
  ['one selected', { defaultValue: 'b' }],
  ['horizontal', { defaultValue: 'a', orientation: 'horizontal' }],
  ['required', { required: true }],
  ['one item disabled', { defaultValue: 'a', disabledItems: ['b'] }],
  ['whole group disabled', { defaultValue: 'a', disabled: true }],
];

for (const [name, props] of scenes) {
  test(`radio-group ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
