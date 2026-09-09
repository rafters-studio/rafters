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

interface SceneProps {
  value?: string;
  defaultValue?: string;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  disabledItem?: string;
  grouped?: boolean;
}

function Scene({ disabledItem, grouped = false, ...props }: SceneProps) {
  const items = (
    <>
      <ComboboxItem value="react" disabled={disabledItem === 'react'}>
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
      <ComboboxInput aria-label="Framework" placeholder="Search framework" />
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
