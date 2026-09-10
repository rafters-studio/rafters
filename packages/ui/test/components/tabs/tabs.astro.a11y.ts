import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Tabs from '../../../src/components/tabs/tabs.astro';
import { bindTabs } from '../../../src/components/tabs/tabs.behavior';

const items = [
  { value: 'overview', label: 'Overview', content: 'Overview panel' },
  { value: 'details', label: 'Details', content: 'Details panel' },
  { value: 'history', label: 'History', content: 'History panel' },
];

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Tabs, {
    props: { id: 'demo', tabs: items, value: 'overview', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  // A tablist is not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindTabs(document.querySelector('[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['first tab selected', {}],
  ['middle tab selected', { value: 'details' }],
  ['last tab selected', { value: 'history' }],
  ['vertical orientation', { orientation: 'vertical' }],
  ['one tab disabled', { tabs: [items[0], { ...items[1], disabled: true }, items[2]] }],
];

for (const [name, props] of scenes) {
  test(`tabs.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
