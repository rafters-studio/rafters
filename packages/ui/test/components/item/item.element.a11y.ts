import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/item/item.element';

function mount(attrs: string): HTMLElement {
  document.body.innerHTML = `<main><div role="listbox" aria-label="Menu"><rafters-item ${attrs}>Profile<span slot="description">Manage your account</span></rafters-item></div></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  ['default', ''],
  ['selected', 'selected'],
  ['disabled', 'disabled'],
];

for (const [name, attrs] of scenes) {
  test(`rafters-item ${name}`, async ({ task }) => {
    const host = mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
