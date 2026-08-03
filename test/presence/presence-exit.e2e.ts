/**
 * The presence exit window, in a REAL browser (#1996 / #2000).
 *
 * WHAT THIS PROVES, AND WHAT IT DOES NOT. Read this before trusting it.
 *
 * Proven here, and only here:
 *  - the generated `--animate-scale-out` value produces a genuinely RUNNING
 *    animation with a non-zero duration, measured through `getAnimations()`;
 *  - the pre-#2000 form of that same value produces an animation of duration
 *    ZERO -- the silent failure the whole fix exists for, invisible to every
 *    jsdom assertion because jsdom has no animation timeline at all;
 *  - a node held through its exit is genuinely renderable mid-flight
 *    (`isConnected`, non-zero currentTime), and goes when the exit ends;
 *  - both disposal shapes: unmount (dialog, popover) and re-`hidden`
 *    (dropdown-menu, which lives in light DOM).
 *
 * NOT proven here: the React wiring. There is no dev server in this repo and a
 * spec may not start one, so this drives the CONTRACT'S DOM SHAPE against the
 * real generated stylesheet rather than mounting DialogContent et al. That the
 * three components produce this shape -- data-state on the content node, inert
 * for the exit window, mount/`hidden` withheld until the exit ends -- is what
 * `packages/ui/test/components/presence-contract.test.tsx` asserts, including
 * the asChild clone path. The two halves meet at the shape asserted below.
 *
 * The CSS is not hand-written. Every value is the design-tokens output pinned
 * by `packages/design-tokens/test/__snapshots__/motion-golden.test.ts.snap`, so
 * a retune that moved the exit off a real duration would desync this file
 * against that golden rather than quietly passing.
 */
import { expect, test } from '@playwright/test';

/** Generated motion values, verbatim from the motion golden. */
const LEAVES = `
  --rafters-duration-fast: 150ms;
  --rafters-duration-normal: 350ms;
  --rafters-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --rafters-ease-spring-snappy: cubic-bezier(0.2, 0.8, 0.2, 1);
`;

/** The generated animation shorthands, post-#2000: built on the declared leaves. */
const ANIMATIONS = `
  --animate-scale-in: scale-in var(--rafters-duration-normal) var(--rafters-ease-spring-snappy);
  --animate-scale-out: scale-out var(--rafters-duration-fast) var(--rafters-ease-exit);
`;

/**
 * The pre-#2000 shorthand: same shape, referencing `--motion-duration-*` /
 * `--motion-easing-*`, which nothing declares in either emission path.
 */
const ANIMATIONS_BUGGED = `
  --animate-scale-out-bugged: scale-out var(--motion-duration-fast) var(--motion-easing-exit);
`;

const KEYFRAMES = `
@keyframes scale-in {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes scale-out {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.96); opacity: 0; }
}
`;

/**
 * The harness. `mode: 'hidden'` is the dropdown-menu shape (present in light
 * DOM, gated by `hidden`); `'unmount'` is the dialog/popover shape.
 *
 * `close()` reproduces exactly what presence does: flip data-state and inert
 * NOW so the exit keyframe starts and the node is already semantically gone,
 * and withhold the disposal -- removal or `hidden` -- until animationend.
 */
function harness(mode: 'unmount' | 'hidden'): string {
  return `
<style>
:root { ${LEAVES} ${ANIMATIONS} ${ANIMATIONS_BUGGED} }
${KEYFRAMES}
#content[data-state="open"] { animation: var(--animate-scale-in); }
#content[data-state="closed"] { animation: var(--animate-scale-out); }
#bugged[data-state="closed"] { animation: var(--animate-scale-out-bugged); }
[hidden] { display: none; }
</style>
<div id="host"></div>
<div id="bugged" data-state="closed"></div>
<script>
  window.disposed = false;
  window.open_ = function () {
    document.getElementById('host').innerHTML =
      '<div id="content" data-part="content" data-state="open"></div>';
    window.disposed = false;
  };
  window.close_ = function () {
    var node = document.getElementById('content');
    node.setAttribute('data-state', 'closed');
    node.setAttribute('inert', '');
    node.addEventListener('animationend', function () {
      ${mode === 'hidden' ? "node.setAttribute('hidden', '');" : 'node.remove();'}
      window.disposed = true;
    }, { once: true });
  };
  window.open_();
</script>
`;
}

for (const mode of ['unmount', 'hidden'] as const) {
  const shape =
    mode === 'unmount' ? 'dialog / popover (mount-gated)' : 'dropdown-menu (hidden-gated)';

  test(`presence exit window: ${shape}`, async ({ page }) => {
    await page.goto('about:blank');
    await page.setContent(harness(mode));

    const content = page.locator('#content');
    await expect(content).toHaveAttribute('data-state', 'open');
    await expect(content).not.toHaveAttribute('inert', '');

    await page.evaluate(() => (window as unknown as { close_: () => void }).close_());

    // MID-EXIT. Sampled immediately after the close, well inside the 150ms the
    // exit runs for. The node must still be attached, still rendering, with a
    // scale-out animation actually on the timeline.
    const midExit = await page.evaluate(() => {
      const node = document.getElementById('content');
      if (!node) return null;
      const running = node.getAnimations().map((a) => ({
        // The keyframe name, via the effect's owning rule.
        name: (a as unknown as { animationName?: string }).animationName ?? '',
        duration: Number(a.effect?.getComputedTiming().duration ?? 0),
        playState: a.playState,
      }));
      return {
        connected: node.isConnected,
        state: node.getAttribute('data-state'),
        inert: node.hasAttribute('inert'),
        hidden: node.hasAttribute('hidden'),
        running,
      };
    });

    expect(midExit, 'the node was disposed of before its exit could run').not.toBeNull();
    expect(midExit?.connected).toBe(true);
    expect(midExit?.state).toBe('closed');
    // Inert, not hidden: the ratified ruling. `hidden` here would be
    // display:none, which removes the node from rendering and kills the exit.
    expect(midExit?.inert).toBe(true);
    expect(midExit?.hidden).toBe(false);

    // A real, running animation of a real duration. This is the assertion jsdom
    // cannot make: it has no animation timeline, so a zero-duration exit is
    // indistinguishable there from a correct one.
    expect(midExit?.running.length, 'no animation on the exiting node').toBeGreaterThan(0);
    // Found by NAME, not by index. Closing interrupts the enter, and whether the
    // dying scale-in is still on the timeline alongside scale-out is exactly the
    // sort of browser-specific ordering this spec must not depend on -- it is
    // also the race the exit-name filter in usePresence exists for.
    const exit = midExit?.running.find((a) => a.name === 'scale-out');
    expect(exit, 'the exit keyframe is not on the timeline').toBeDefined();
    expect(exit?.duration, 'the exit resolved to a zero duration -- the #2000 failure').toBe(150);
    expect(exit?.playState).toBe('running');

    // POST-EXIT. Disposal is held until the animation ends, then lands.
    await page.waitForFunction(() => (window as unknown as { disposed: boolean }).disposed, null, {
      timeout: 5000,
    });
    if (mode === 'unmount') {
      await expect(content).toHaveCount(0);
    } else {
      await expect(content).toHaveAttribute('hidden', '');
    }
  });
}

test('#2000: the pre-fix animation value resolves to a zero duration', async ({ page }) => {
  // The regression this PR fixes, stated as the browser states it. A var() onto
  // an undeclared custom property makes the animation shorthand's duration
  // component vanish -- `animation: scale-out  ;` -- which parses, initialises
  // duration to 0s, and runs to completion in the same frame. Nothing errors,
  // nothing warns, and the element simply does not animate.
  await page.goto('about:blank');
  await page.setContent(harness('unmount'));

  const durations = await page.evaluate(() => {
    const bugged = document.getElementById('bugged');
    const fixed = document.getElementById('content');
    const read = (el: HTMLElement | null) => getComputedStyle(el as HTMLElement).animationDuration;
    return { bugged: read(bugged), fixed: read(fixed) };
  });

  expect(durations.bugged, 'the pre-fix form should compute to no duration at all').toBe('0s');
  // ...and the shipped form does not, which is the whole of the fix.
  expect(durations.fixed).not.toBe('0s');
});
