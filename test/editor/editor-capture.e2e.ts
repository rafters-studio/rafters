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
import type { Locator, Page } from '@playwright/test';
import { parseCaret } from '../../packages/ui/test/harness/caret';
import {
  EDITOR_SCENARIOS,
  type EditorScenario,
} from '../../packages/ui/test/harness/editor-scenarios';
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

// -----------------------------------------------------------------------------
// Caret-notation scenario table (FR-EDITOR-006) -- the SAME EDITOR_SCENARIOS
// the model-level BDD (editor.behavior.test.ts) replays via
// caret.ts's given/when/then, replayed HERE through real keyboard/paste input
// into the real bound contenteditable. One authored list, two runners -- not
// a re-authored, drifting second set of cases (issue AC).
//
// FILTERED to scenarios whose `given` seeds a COLLAPSED caret only: this
// repo's Playwright harness (buildEditorHarness's SeedCaret) can only seed a
// collapsed position, and bindEditor never reads the live DOM Selection back
// into the model (RULING-EDITOR-HISTORY's pinned amendment: "fable's #1 (no
// DOM->model selection) is OUT of scope here"), so a scenario that starts
// from a RANGE selection (`he[llo]`) cannot be driven through real input --
// it stays proven at the model level only (editor.behavior.test.ts), which
// is where the canonical "undo restores document AND selection" scenario
// (itself range-seeded) already runs. The filtered set still covers every
// named category the issue's Interface section asks Playwright to cover:
// typing, backspace, delete, paste, undo, redo.
// -----------------------------------------------------------------------------

const PLAYWRIGHT_SCENARIOS = EDITOR_SCENARIOS.filter((s) => !s.given.includes('['));

async function performScenarioAction(
  page: Page,
  surface: Locator,
  action: EditorScenario['steps'][number]['action'],
): Promise<void> {
  switch (action.kind) {
    case 'type':
      // Clears NFR-EDITOR-003's coalescing window (500ms) so this step
      // commits its OWN HistoryEntry -- matching the model-level `when()`,
      // which binds a fresh history per call for exactly this reason. Without
      // it, two consecutive `type` steps on adjacent offsets would coalesce
      // into one real HistoryEntry and one undo would unwind both at once.
      await page.waitForTimeout(600);
      await page.keyboard.type(action.text);
      return;
    case 'paste':
      await page.waitForTimeout(600);
      // Same synthetic-ClipboardEvent technique as the hand-written paste
      // test above (see its comment for why `clipboardData` is shadowed via
      // defineProperty rather than relying on the constructor's init dict).
      await surface.evaluate((el, text) => {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'clipboardData', { value: dt, configurable: true });
        el.dispatchEvent(event);
      }, action.text);
      return;
    case 'backspace':
      await page.keyboard.press('Backspace');
      return;
    case 'delete':
      await page.keyboard.press('Delete');
      return;
    case 'undo':
      // ctrlKey, not metaKey: editorKeymap claims BOTH chords (FR-EDITOR-005),
      // and Control+z is the one chord Playwright drives identically across
      // chromium/firefox/webkit without a per-OS branch.
      await page.keyboard.press('Control+z');
      return;
    case 'redo':
      await page.keyboard.press('Control+Shift+z');
      return;
  }
}

for (const scenario of PLAYWRIGHT_SCENARIOS) {
  test(`caret-notation scenario: ${scenario.name}`, async ({ page }) => {
    const seed = parseCaret(scenario.given);
    await page.goto('about:blank');
    await page.setContent(
      await buildEditorHarness({
        blocks: [{ id: 'b1', type: 'text', content: seed.doc }],
        caret: { blockId: 'b1', offset: seed.sel.anchor },
      }),
    );
    const surface = page.locator('[data-part="root"]');
    // No click: buildEditorHarness's own inline script already calls
    // `root.focus()` right after `bindEditor`, whose first `render()` already
    // restored the DOM selection from the SEEDED `state.sel` -- clicking the
    // (unconstrained-width) root here would instead re-place the caret at the
    // browser's own click-derived offset, silently overriding the very seed
    // offset each scenario's `given` pins.
    for (const step of scenario.steps) {
      await performScenarioAction(page, surface, step.action);

      const expected = parseCaret(step.expected);
      await expect(surface, `after ${JSON.stringify(step.action)}`).toHaveText(expected.doc);

      // Every filtered scenario's steps land on a collapsed caret (no `[`
      // survives the filter above, and insertText/removeText/undo/redo all
      // resolve to a collapsed selection) -- the produced ops are asserted
      // indirectly through the projected text above; this is the DOM
      // Selection half of the AC ("DOM selection matches state.sel after
      // every edit").
      const sel = await page.evaluate(() => {
        const s = window.getSelection();
        return { focusOffset: s?.focusOffset ?? -1, collapsed: s?.isCollapsed ?? false };
      });
      expect(sel.collapsed, `after ${JSON.stringify(step.action)}`).toBe(true);
      expect(sel.focusOffset, `after ${JSON.stringify(step.action)}`).toBe(expected.sel.head);
    }
  });
}
