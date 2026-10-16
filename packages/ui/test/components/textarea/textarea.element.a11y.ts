import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/textarea/textarea.element';

function mount(markup: string): HTMLElement {
  document.body.innerHTML = `<main>${markup}</main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const SCENARIOS: Array<[string, string]> = [
  ['bare', ''],
  ['invalid with error', 'invalid'],
  ['required', 'required'],
  ['disabled', 'disabled'],
  ['readonly', 'readonly value="hi"'],
  ['seeded value', 'value="hi"'],
];

for (const [name, attrs] of SCENARIOS) {
  test(`rafters-textarea ${name}`, async ({ task }) => {
    const error =
      name === 'invalid with error' ? '<div data-part="error" id="e">Required</div>' : '';
    const host = mount(
      `<rafters-textarea aria-label="Message" ${attrs}>${error}</rafters-textarea>`,
    );
    await Promise.resolve();
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
