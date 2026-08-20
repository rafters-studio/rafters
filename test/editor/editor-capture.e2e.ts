/**
 * editor-capture.e2e.ts (Playwright, REAL browser -- chromium/firefox/webkit
 * per playwright.config.ts).
 *
 * FR-EDITOR-004 is the highest-risk part of the editor rewrite; `beforeinput`
 * capture, projection, and selection restore are proven HERE and only here.
 * happy-dom has no real `beforeinput` semantics, so it is deliberately NOT used
 * to claim capture coverage (issue AC).
 *
 * No dev server (see test/presence/presence-exit.e2e.ts): `about:blank` +
 * `page.setContent(harness)`, where the harness's inline script is the REAL
 * compiled `bindEditor` bundled by `buildEditorHarness`.
 */
import { expect, test } from '@playwright/test';
import { buildEditorHarness } from './support/build-editor-harness';

test('typing dispatches insertText ops and projects them', async ({ page }) => {
  await page.goto('about:blank');
  await page.setContent(
    await buildEditorHarness({ blocks: [{ id: 'b1', type: 'text', content: '' }] }),
  );
  const surface = page.locator('[data-part="root"]');
  await surface.click();
  await page.keyboard.type('hello');
  await expect(surface).toHaveText('hello');
});

test('backspace at block start merges with the previous block', async ({ page }) => {
  await page.goto('about:blank');
  await page.setContent(
    await buildEditorHarness({
      blocks: [
        { id: 'b1', type: 'text', content: 'first' },
        { id: 'b2', type: 'text', content: 'second' },
      ],
      caret: { blockId: 'b2', offset: 0 },
    }),
  );
  await page.keyboard.press('Backspace');
  await expect(page.locator('[data-part="root"]')).toHaveText('firstsecond');
});

test('delete at intra-text position removes the following character', async ({ page }) => {
  await page.goto('about:blank');
  await page.setContent(
    await buildEditorHarness({
      blocks: [{ id: 'b1', type: 'text', content: 'abc' }],
      caret: { blockId: 'b1', offset: 1 },
    }),
  );
  await page.keyboard.press('Delete');
  await expect(page.locator('[data-block-id="b1"]')).toHaveText('ac');
});

test('pasting plain text produces insert ops and the resulting doc matches', async ({ page }) => {
  await page.goto('about:blank');
  await page.setContent(
    await buildEditorHarness({ blocks: [{ id: 'b1', type: 'text', content: '' }] }),
  );
  const surface = page.locator('[data-part="root"]');
  await surface.click();
  // Drive paste through a real ClipboardEvent carrying text/plain.
  await surface.evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'pasted');
    el.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    );
  });
  await expect(surface).toHaveText('pasted');
});

test('selection is restored from state.sel after every edit', async ({ page }) => {
  await page.goto('about:blank');
  await page.setContent(
    await buildEditorHarness({ blocks: [{ id: 'b1', type: 'text', content: '' }] }),
  );
  await page.locator('[data-part="root"]').click();
  await page.keyboard.type('hey');
  // Black-box: after typing 3 characters into an empty block, the native caret
  // must land at offset 3 in that text node.
  const focusOffset = await page.evaluate(() => window.getSelection()?.focusOffset);
  expect(focusOffset).toBe(3);
});
