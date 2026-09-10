import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import HoverCard from '../../../src/components/hover-card/hover-card.astro';
import { bindHoverCard } from '../../../src/components/hover-card/hover-card.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(HoverCard, {
    props: { id: 'hc', href: '/user/john', label: 'John Doe', ...props },
    slots: { default: '@john', content: '<span>Software Engineer</span>' },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindHoverCard(document.querySelector('[data-part="root"][data-hover-card]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['closed', {}],
  ['default open', { defaultOpen: true }],
  ['un-hoverable content closed', { disableHoverableContent: true }],
  ['open on the top start side', { defaultOpen: true, side: 'top', align: 'start', sideOffset: 0 }],
];

for (const [name, props] of scenes) {
  test(`hover-card.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
