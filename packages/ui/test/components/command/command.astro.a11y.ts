import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Command from '../../../src/components/command/command.astro';
import { bindCommand } from '../../../src/components/command/command.behavior';

const items = [
  { value: 'calendar', label: 'Calendar' },
  { value: 'search', label: 'Search' },
  { value: 'settings', label: 'Settings', shortcut: 'Cmd+S' },
];

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Command, {
    props: { id: 'c', items, label: 'Actions', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindCommand(document.querySelector('rafters-command') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['all options visible', {}],
  ['default listbox label', { label: undefined }],
  ['custom placeholder and empty text', { placeholder: 'Search actions', emptyText: 'Nothing.' }],
  [
    'with a disabled option',
    { items: [items[0], { value: 'search', label: 'Search', disabled: true }, items[2]] },
  ],
  ['without shortcuts', { items: items.map(({ value, label }) => ({ value, label })) }],
  ['single option', { items: [items[0]] }],
];

for (const [name, props] of scenes) {
  test(`command.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
