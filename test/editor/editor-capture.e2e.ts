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

test('backspace removes a whole emoji grapheme, not half a surrogate pair', async ({ page }) => {
  // Canary for the targetRanges fix: raw UTF-16 `offset - 1` arithmetic would
  // remove only the low surrogate of the astral emoji, leaving a lone
  // surrogate (`'a\uD83D'`) instead of `'a'`. Only the browser's own
  // `getTargetRanges()` knows the grapheme spans 2 code units.
  await page.goto('about:blank');
  await page.setContent(
    await buildEditorHarness({
      blocks: [{ id: 'b1', type: 'text', content: `a${String.fromCodePoint(0x1f600)}` }],
      caret: { blockId: 'b1', offset: 3 },
    }),
  );
  await page.locator('[data-part="root"]').click();
  await page.keyboard.press('Backspace');
  await expect(page.locator('[data-block-id="b1"]')).toHaveText('a');
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
  // Drive paste through a real ClipboardEvent carrying text/plain. Gecko does
  // NOT populate `event.clipboardData` from the `ClipboardEvent` constructor's
  // init dict for a synthetic (untrusted) event -- only Chromium/WebKit honor
  // it that way -- so the constructor-injected `clipboardData` is invisible to
  // `createClipboard`'s `getData('text/plain')` there. `clipboardData` is
  // otherwise an ordinary configurable accessor on the event instance, so
  // shadowing it with `Object.defineProperty` after construction sidesteps
  // that native getter entirely (in every engine) instead of depending on the
  // constructor init dict being honored.
  await surface.evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'pasted');
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: dt, configurable: true });
    el.dispatchEvent(event);
  });
  await expect(surface).toHaveText('pasted');
});

test('IME composition commits as one insertText op on compositionend', async ({ page }) => {
  await page.goto('about:blank');
  await page.setContent(
    await buildEditorHarness({ blocks: [{ id: 'b1', type: 'text', content: '' }] }),
  );
  const surface = page.locator('[data-part="root"]');
  await surface.click();
  // Real OS-level IME automation isn't available through Playwright, so drive
  // the composition lifecycle with the same synthetic-dispatch technique the
  // paste test uses. `bindEditor` never inspects the DOM the browser rendered
  // mid-composition -- `onCompositionEnd` commits `event.data` as one
  // `insertText` and force-reprojects (`prevDoc = null`) -- so this proves the
  // commit path (the one this issue's AC actually covers) regardless of
  // whether a real IME painted intermediate glyphs.
  await surface.evaluate((el) => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { data: '', bubbles: true }));
    el.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'nihongo', bubbles: true }));
    el.dispatchEvent(new CompositionEvent('compositionend', { data: '日本語', bubbles: true }));
  });
  await expect(surface).toHaveText('日本語');
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
