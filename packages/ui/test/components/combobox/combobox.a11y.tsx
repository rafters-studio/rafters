import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
} from '../../../src/components/combobox/combobox';

const mark = (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <title>Framework mark</title>
    <rect width="24" height="24" fill="currentColor" />
  </svg>
);

interface SceneProps {
  value?: string;
  defaultValue?: string;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  disabledItem?: string;
  grouped?: boolean;
  icons?: boolean;
}

function Scene({ disabledItem, grouped = false, icons = false, ...props }: SceneProps) {
  const items = (
    <>
      <ComboboxItem
        value="react"
        disabled={disabledItem === 'react'}
        startIcon={icons ? mark : undefined}
      >
        React
      </ComboboxItem>
      <ComboboxItem value="vue" disabled={disabledItem === 'vue'}>
        Vue
      </ComboboxItem>
      <ComboboxItem value="angular" disabled={disabledItem === 'angular'}>
        Angular
      </ComboboxItem>
    </>
  );
  return (
    <Combobox {...props}>
      <ComboboxInput
        aria-label="Framework"
        placeholder="Search framework"
        startIcon={icons ? mark : undefined}
      />
      <ComboboxContent>
        <ComboboxEmpty>No framework found.</ComboboxEmpty>
        {grouped ? <ComboboxGroup heading="Frameworks">{items}</ComboboxGroup> : items}
      </ComboboxContent>
    </Combobox>
  );
}

const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['closed', {}],
  ['open', { defaultOpen: true }],
  ['open with a selection', { defaultOpen: true, defaultValue: 'vue' }],
  ['closed with a controlled value', { value: 'react' }],
  ['controlled open', { open: true }],
  ['disabled', { disabled: true }],
  ['open with a disabled option', { defaultOpen: true, disabledItem: 'vue' }],
  ['open with a headed group', { defaultOpen: true, grouped: true }],
  ['open with start icons', { defaultOpen: true, icons: true }],
];

for (const [name, props] of scenes) {
  test(`combobox ${name}`, async ({ task }) => {
    const { container } = await render(
      <main>
        <Scene {...props} />
      </main>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
