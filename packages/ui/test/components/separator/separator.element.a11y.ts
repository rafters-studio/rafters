import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/separator/separator.element';

function mount(attrs: string): HTMLElement {
  document.body.innerHTML = `<main><p>Above</p><rafters-separator ${attrs}></rafters-separator><p>Below</p></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

// `decorative` is presence-based on the element: absent (or "false") is a
// decorative rule; present is the semantic separator.
const scenes: ReadonlyArray<[string, string]> = [
  ['decorative horizontal', ''],
  ['decorative vertical', 'orientation="vertical"'],
  ['semantic horizontal', 'decorative'],
  ['semantic vertical', 'decorative orientation="vertical"'],
];

for (const [name, attrs] of scenes) {
  test(`rafters-separator ${name}`, async ({ task }) => {
    const host = mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
