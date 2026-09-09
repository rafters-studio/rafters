import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/textarea/textarea.element';

/**
 * The light-DOM markup the element conformance test mounts: a real
 * <textarea data-part="textarea"> named by aria-label, optionally with an
 * error sibling. A <textarea> holds its initial value as child text.
 */
async function mount(inner: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main><rafters-textarea>${inner}</rafters-textarea></main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  ['valid empty', '<textarea data-part="textarea" id="t" aria-label="Message"></textarea>'],
  [
    'invalid with error message',
    '<textarea data-part="textarea" id="t" aria-label="Message" aria-invalid="true"></textarea><div data-part="error" id="t-error">Required</div>',
  ],
  ['required', '<textarea data-part="textarea" id="t" aria-label="Message" required></textarea>'],
  ['disabled', '<textarea data-part="textarea" id="t" aria-label="Message" disabled></textarea>'],
  [
    'read-only with seeded text',
    '<textarea data-part="textarea" id="t" aria-label="Message" readonly>seed</textarea>',
  ],
  [
    'named by a paired label',
    '<label for="t">Message</label><textarea data-part="textarea" id="t"></textarea>',
  ],
];

for (const [name, inner] of scenes) {
  test(`rafters-textarea ${name}`, async ({ task }) => {
    const host = await mount(inner);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
