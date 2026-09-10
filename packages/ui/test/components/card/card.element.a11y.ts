import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/card/card.element';

function mount(attrs: string, slotted: string): HTMLElement {
  // A card is a surface, not a landmark; the page around it supplies the region.
  document.body.innerHTML = `<main><rafters-card ${attrs}>${slotted}</rafters-card></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const FULL_FAMILY =
  '<h3 slot="title">Quarterly report</h3>' +
  '<p slot="description">Published this week</p>' +
  '<button slot="action" type="button">Menu</button>' +
  '<p slot="content">Revenue is up.</p>' +
  '<button slot="footer" type="button">Read more</button>';

const scenes: ReadonlyArray<[string, string, string]> = [
  ['title and content', '', '<h3 slot="title">Report</h3><div slot="content">Body</div>'],
  ['full family', '', FULL_FAMILY],
  ['fill primary', 'fill="primary"', FULL_FAMILY],
  ['fill muted/50', 'fill="muted/50"', FULL_FAMILY],
  ['title at heading level 2', '', '<h2 slot="title">Report</h2><p slot="content">Body</p>'],
  ['body only', '', '<p>Just a body</p>'],
];

for (const [name, attrs, slotted] of scenes) {
  test(`rafters-card ${name}`, async ({ task }) => {
    const host = mount(attrs, slotted);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
