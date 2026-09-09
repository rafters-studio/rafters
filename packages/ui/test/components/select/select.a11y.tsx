import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../src/components/select/select';

interface SceneProps {
  defaultValue?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  name?: string;
  disabledItem?: string;
}

const OPTIONS: ReadonlyArray<[string, string]> = [
  ['apple', 'Apple'],
  ['banana', 'Banana'],
  ['cherry', 'Cherry'],
];

function Scene({ disabledItem, ...props }: SceneProps) {
  // The listbox lives in light DOM (present-but-hidden), so the whole select
  // renders inside the container and axe can run there in every state.
  return (
    <main>
      <Select {...props}>
        <SelectTrigger aria-label="Fruit">
          <SelectValue placeholder="Pick a fruit" />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map(([value, label]) => (
            <SelectItem key={value} value={value} disabled={disabledItem === value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open', { defaultOpen: true }],
  ['closed with a selected value', { defaultValue: 'banana' }],
  ['open with a selected value', { defaultValue: 'banana', defaultOpen: true }],
  ['open with one option disabled', { defaultOpen: true, disabledItem: 'banana' }],
  ['disabled', { disabled: true }],
  ['form associated', { name: 'fruit', defaultValue: 'apple' }],
];

for (const [name, props] of scenes) {
  test(`select ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
