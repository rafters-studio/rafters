import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Collapsible from '../../../src/components/collapsible/collapsible.astro';
import { bindCollapsible } from '../../../src/components/collapsible/collapsible.behavior';

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string> = { default: '<p>Revealed content</p>' },
): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Collapsible, { props: { id: 'c', ...props }, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindCollapsible(document.querySelector('rafters-collapsible') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>, Record<string, string>?]> = [
  ['closed', {}],
  ['default open', { defaultOpen: true }],
  ['disabled closed', { disabled: true }],
  ['disabled open', { disabled: true, defaultOpen: true }],
  ['custom label', { label: 'Show details' }],
  [
    'trigger slot',
    {},
    { trigger: '<span>Advanced options</span>', default: '<p>Revealed content</p>' },
  ],
];

for (const [name, props, slots] of scenes) {
  test(`collapsible.astro ${name}`, async ({ task }) => {
    const document = await mount(props, slots);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
