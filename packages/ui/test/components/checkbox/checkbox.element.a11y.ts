import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/checkbox/checkbox.element';

async function mount(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main>${markup}</main>`;
  await Promise.resolve();
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  ['unchecked', ''],
  ['seeded checked', 'checked'],
  ['indeterminate', 'checked="indeterminate"'],
  ['required', 'required'],
  ['disabled', 'disabled'],
  ['destructive lg', 'variant="destructive" size="lg" checked'],
  ['named with a hidden input', 'name="terms" checked'],
];

for (const [name, attrs] of scenes) {
  test(`rafters-checkbox ${name}`, async ({ task }) => {
    const host = await mount(
      `<rafters-checkbox ${attrs} aria-label="Accept terms"></rafters-checkbox>`,
    );
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
