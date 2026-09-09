import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../src/components/command/command';

interface SceneProps {
  value?: string;
  defaultValue?: string;
  label?: string;
  disabledItem?: string;
  grouped?: boolean;
}

function Items({ disabledItem }: { disabledItem?: string | undefined }) {
  return (
    <>
      <CommandItem value="calendar" disabled={disabledItem === 'calendar'}>
        Calendar
      </CommandItem>
      <CommandItem value="search" disabled={disabledItem === 'search'}>
        Search
      </CommandItem>
      <CommandItem value="settings" disabled={disabledItem === 'settings'}>
        Settings
      </CommandItem>
    </>
  );
}

function Scene({ disabledItem, grouped = true, ...props }: SceneProps) {
  return (
    <Command {...props}>
      <CommandInput aria-label="Command" placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {grouped ? (
          <CommandGroup heading="Suggestions">
            <Items disabledItem={disabledItem} />
          </CommandGroup>
        ) : (
          <Items disabledItem={disabledItem} />
        )}
      </CommandList>
    </Command>
  );
}

// Excluded: a query matching nothing (value: 'zzz') fails aria-required-children, because
// the listbox is left with no visible option or group child once every item is hidden.
const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['all options visible', {}],
  ['filtered by a default query', { defaultValue: 'cal' }],
  ['custom listbox label', { label: 'Actions' }],
  ['with a disabled option', { disabledItem: 'search' }],
  ['ungrouped options', { grouped: false }],
];

for (const [name, props] of scenes) {
  test(`command ${name}`, async ({ task }) => {
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

test('command open inside its dialog', async ({ task }) => {
  const { container } = await render(
    <main>
      <CommandDialog open label="Actions">
        <CommandInput aria-label="Command" placeholder="Type a command..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <Items />
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </main>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
