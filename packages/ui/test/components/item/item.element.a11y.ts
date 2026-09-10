import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/item/item.element';

/** An option needs a listbox ancestor (axe aria-required-parent), and page
 *  content needs a landmark; mount inside both, as the conformance test does.
 *  The element renders synchronously into its shadow root: nothing to await. */
function mount(attrs: string, slots: string): HTMLElement {
  document.body.innerHTML = `<main><div role="listbox" aria-label="Options"><rafters-item ${attrs}>${slots}</rafters-item></div></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string, string]> = [
  ['default', '', 'Settings'],
  ['selected', 'selected', 'Dashboard'],
  ['disabled', 'disabled', 'Admin Panel'],
  [
    'with icon and description',
    '',
    '<span slot="icon">*</span>Profile<span slot="description">Manage your account</span>',
  ],
  ['size sm', 'size="sm"', 'Compact'],
  ['size lg', 'size="lg"', 'Roomy'],
];

for (const [name, attrs, slots] of scenes) {
  test(`rafters-item ${name}`, async ({ task }) => {
    const host = mount(attrs, slots);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
