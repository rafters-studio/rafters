import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Tooltip from '../../../src/components/tooltip/tooltip.astro';
import { bindTooltip } from '../../../src/components/tooltip/tooltip.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Tooltip, {
    props: { id: 't', content: 'More info', ...props },
    slots: { default: 'Help' },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  // A tooltip root is not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindTooltip(document.querySelector('[data-part="root"][data-tooltip]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['closed', {}],
  ['open by default', { defaultOpen: true }],
  ['open on the left side', { defaultOpen: true, side: 'left', align: 'start' }],
  ['hoverable content disabled', { disableHoverableContent: true }],
  ['open with hoverable content disabled', { defaultOpen: true, disableHoverableContent: true }],
];

for (const [name, props] of scenes) {
  test(`tooltip.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
