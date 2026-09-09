import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Badge from '../../../src/components/badge/badge.astro';
import { BADGE_SIZES, BADGE_VARIANTS } from '../../../src/components/badge/badge.behavior';

async function mount(props: Record<string, unknown>, label: string): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Badge, { props, slots: { default: label } });
  const window = new Window();
  window.document.body.innerHTML = `<main>${html}</main>`;
  // Badge is a pure static: no bindBadge exists, so nothing to hydrate.
  return window.document as unknown as Document;
}

for (const variant of BADGE_VARIANTS) {
  test(`badge.astro variant=${variant}`, async ({ task }) => {
    const document = await mount({ variant }, variant);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of BADGE_SIZES) {
  test(`badge.astro size=${size}`, async ({ task }) => {
    const document = await mount({ size }, 'Label');
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
    // SSR markup has no layout, so layout rules are honestly inapplicable;
    // the object still carries all four buckets.
    expect(Object.keys(results)).toEqual(
      expect.arrayContaining(['passes', 'violations', 'incomplete', 'inapplicable']),
    );
  });
}
