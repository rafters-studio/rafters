/**
 * The negative control for the whole a11y tier.
 *
 * Every file in this tier ends the same two lines: run `runAxe` over a host,
 * then assert `results.violations` is empty. That pattern is only worth
 * anything if it can actually fail. A misconfigured axe, a host element that
 * resolves to nothing, or a `runAxe` that quietly returned an empty result
 * would make all 187 files pass while auditing nothing, and no individual
 * scene could tell you -- each one would look exactly as green as it does now.
 *
 * So this file feeds the same pipeline a host with a violation axe is certain
 * to find, and asserts it IS found. If this test ever stops failing to be
 * clean, the tier has gone vacuous and every other green result in it means
 * nothing.
 *
 * It replaces the guard the editor conformance suite used to carry
 * (`editor.conformance.test.tsx` on main, "sanity: assertAxeClean, scoped this
 * same way, DOES fail an unnamed textbox"), which went away with
 * `assertAxeClean` itself.
 */
import { expect, test } from 'vitest';
import { runAxe } from './run-axe';

function host(html: string): HTMLElement {
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body.querySelector('main') as HTMLElement;
}

test('the tier can fail: an unnamed textbox is reported as a violation', async ({ task }) => {
  const results = await runAxe(
    host('<div role="textbox" aria-multiline="true" contenteditable="true"></div>'),
  );
  task.meta.axe = results;
  expect(results.violations).not.toEqual([]);
  expect(results.violations.map((violation) => violation.id)).toContain('aria-input-field-name');
});

test('the tier can fail: an image with no alternative text is reported', async ({ task }) => {
  const results = await runAxe(host('<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">'));
  task.meta.axe = results;
  expect(results.violations.map((violation) => violation.id)).toContain('image-alt');
});

test('the same pipeline reports no violation for a host that has none', async ({ task }) => {
  // The other half of the control: the two above would also "pass" if runAxe
  // reported violations indiscriminately. Together they show it discriminates.
  const results = await runAxe(host('<p>Plain text in a landmark.</p>'));
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
