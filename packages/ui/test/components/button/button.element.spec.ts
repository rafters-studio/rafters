/**
 * Browser-project smoke for the Web Component target: the custom element
 * upgrades in real chromium and its light-DOM root is reachable by role.
 * `rafters-button` is a light-DOM enhancer (it binds the author-provided
 * <button data-part="root"> rather than rendering a shadow tree), so the
 * markup carries the inner button the element expects.
 */
import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { RaftersButton } from '../../../src/components/button/button.element';

test('custom element upgrades in a real browser', async () => {
  document.body.innerHTML =
    '<rafters-button><button data-part="root" id="b1">Go</button></rafters-button>';
  await expect.element(page.getByRole('button', { name: 'Go' })).toBeVisible();
  expect(document.querySelector('rafters-button')).toBeInstanceOf(RaftersButton);
});
