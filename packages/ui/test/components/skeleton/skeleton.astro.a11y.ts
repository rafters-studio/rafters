import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Skeleton from '../../../src/components/skeleton/skeleton.astro';

async function mount(count: number, withText: boolean): Promise<Document> {
  const container = await AstroContainer.create();
  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    parts.push(await container.renderToString(Skeleton, { props: {} }));
  }
  const window = new Window();
  const document = window.document as unknown as Document;
  const text = withText ? '<p>Loading the profile.</p>' : '';
  document.body.innerHTML = `<main>${text}${parts.join('')}</main>`;
  // Skeleton is a pure static: no bindSkeleton exists, so nothing to hydrate.
  return document;
}

// Skeleton is a decorative leaf: the score projects aria-hidden on every
// instance, so there is no labelled form -- only composition varies.
const scenes: ReadonlyArray<[string, number, boolean]> = [
  ['default leaf', 1, false],
  ['several placeholders beside text', 3, true],
];

for (const [name, count, withText] of scenes) {
  test(`skeleton.astro ${name}`, async ({ task }) => {
    const document = await mount(count, withText);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
