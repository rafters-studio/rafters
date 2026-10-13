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

test('toggle-group with start and end icons, svg title does not leak into the name', async ({
  task,
}) => {
  const icon = (
    <svg viewBox="0 0 24 24" width="16" height="16">
      <title>Mail</title>
      <path d="M2 4h20v16H2z" stroke="currentColor" />
    </svg>
  );
  const { container } = await render(
    <main>
      <ToggleGroup aria-label="Text formatting">
        <ToggleGroupItem value="a" startIcon={icon} endIcon={icon}>
          Alpha
        </ToggleGroupItem>
        <ToggleGroupItem value="b">Beta</ToggleGroupItem>
      </ToggleGroup>
    </main>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(container.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(2);
});
