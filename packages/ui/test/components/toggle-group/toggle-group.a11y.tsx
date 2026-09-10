import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { ToggleGroup, ToggleGroupItem } from '../../../src/components/toggle-group/toggle-group';

interface SceneProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  orientation?: 'horizontal' | 'vertical';
  disabled?: boolean;
  disabledItems?: string[];
}

const ITEMS: ReadonlyArray<[string, string]> = [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma'],
];

/** A group is not a landmark; the page around it supplies the region. */
function Scene({ disabledItems = [], type = 'single', ...props }: SceneProps) {
  return (
    <main>
      <ToggleGroup aria-label="Text formatting" type={type} {...props}>
        {ITEMS.map(([value, label]) => (
          <ToggleGroupItem key={value} value={value} disabled={disabledItems.includes(value)}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </main>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['single nothing selected', {}],
  ['single one selected', { defaultValue: 'a' }],
  ['multiple two selected', { type: 'multiple', defaultValue: ['a', 'c'] }],
  ['vertical orientation', { defaultValue: 'b', orientation: 'vertical' }],
  ['one item disabled', { disabledItems: ['b'] }],
  ['whole group disabled', { disabled: true }],
];

for (const [name, props] of scenes) {
  test(`toggle-group ${name}`, async ({ task }) => {
    const { container } = await render(<Scene {...props} />);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
