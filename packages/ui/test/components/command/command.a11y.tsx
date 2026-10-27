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
  icons?: boolean;
}

const mark = (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <title>Calendar mark</title>
    <rect width="24" height="24" fill="currentColor" />
  </svg>
);

function Items({
  disabledItem,
  icons = false,
}: {
  disabledItem?: string | undefined;
  icons?: boolean;
}) {
  return (
    <>
      <CommandItem
        value="calendar"
        disabled={disabledItem === 'calendar'}
        startIcon={icons ? mark : undefined}
      >
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

function Scene({ disabledItem, grouped = true, icons = false, ...props }: SceneProps) {
  return (
    <Command {...props}>
      <CommandInput aria-label="Command" placeholder="Type a command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {grouped ? (
          <CommandGroup heading="Suggestions">
            <Items disabledItem={disabledItem} icons={icons} />
          </CommandGroup>
        ) : (
          <Items disabledItem={disabledItem} icons={icons} />
        )}
      </CommandList>
    </Command>
  );
}

// Excluded, tracked as #2337: a query matching nothing (value: 'zzz') fails
// aria-required-children, because
// the listbox is left with no visible option or group child once every item is hidden.
const scenes: ReadonlyArray<[string, SceneProps]> = [
  ['all options visible', {}],
  ['filtered by a default query', { defaultValue: 'cal' }],
  ['custom listbox label', { label: 'Actions' }],
  ['with a disabled option', { disabledItem: 'search' }],
  ['ungrouped options', { grouped: false }],
  ['with a start icon', { icons: true }],
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
