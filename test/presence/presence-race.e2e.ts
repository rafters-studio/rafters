/**
 * usePresence in a REAL browser (#2157).
 *
 * WHY THIS FILE HAS TO EXIST. The hook stopped measuring durations and running
 * a `setTimeout` against them; it now asks the node what is running
 * (`getAnimations()`) and awaits those animations' own `finished` promises. Two
 * of the three claims that rewrite rests on are unobservable in a test DOM,
 * which has no animation timeline at all:
 *
 *   1. `getAnimations()` flushes pending style before it answers, so the effect
 *      that runs right after the `data-state="closed"` commit sees the EXIT
 *      animation and not a stale enter;
 *   2. interrupting a running enter CANCELS it, and a cancelled animation is not
 *      handed back by `getAnimations()` -- and even where an engine does hand it
 *      back, its rejected `finished` is absorbed by `Promise.allSettled` rather
 *      than collapsing the wait.
 *
 * The deleted implementation's own comments recorded that this race "was
 * invisible in jsdom: it took watching a real browser to see it". So it is
 * watched in a real browser, in all three engines the project runs.
 *
 * The harness bundles the genuine hook out of `packages/ui/src/hooks` -- there
 * is no dev server here and a spec may not start one, so esbuild plus
 * `page.setContent` is the route (same shape as the editor harness).
 */
import { expect, test } from '@playwright/test';
import type { PresenceProbe } from './support/presence-harness-entry';
import { buildPresenceHarness, ENTER_MS, EXIT_MS } from './support/build-presence-harness';

async function openHarness(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('about:blank');
  await page.setContent(await buildPresenceHarness());
}

async function probe(page: import('@playwright/test').Page): Promise<PresenceProbe> {
  return page.evaluate(
    () => (window as unknown as { __presence: PresenceProbe }).__presence,
  ) as Promise<PresenceProbe>;
}

test('presence waits for the real exit, not the cancelled enter, on rapid interrupt', async ({
  page,
}) => {
  await openHarness(page);

  await page.click('#open');
  await expect(page.locator('#node')).toHaveAttribute('data-state', 'open');
  // Interrupt: the enter runs for 1200ms, and the click round-trip is nowhere
  // near that.
  await page.click('#close');

  await page.waitForFunction(
    () => (window as unknown as { __presence: PresenceProbe }).__presence.removedAt !== null,
    null,
    { timeout: 5000 },
  );
  const result = await probe(page);

  // The interrupt was genuine: the enter was still on the timeline when close
  // was pressed. Without this the whole test could pass as an ordinary close.
  expect(
    result.runningAtClose,
    'the enter had already finished -- this was not an interrupt',
  ).toContain('presence-enter');

  // The hook observed the EXIT. This is claim 1: the effect ran after the
  // data-state commit and `getAnimations()` flushed the new rule into view.
  expect(result.observedByHook, 'presence awaited the wrong animation').toEqual(['presence-exit']);
  expect(result.observedDurations).toEqual([EXIT_MS]);

  const held = (result.removedAt ?? 0) - (result.closedAt ?? 0);
  // Lower bound: releasing on the cancelled enter would land at ~0ms and
  // truncate the exit before its first frame paints.
  expect(held, 'presence released on the cancelled enter, not the exit').toBeGreaterThan(
    EXIT_MS / 2,
  );
  // Upper bound: waiting on the cancelled enter's full run would land at
  // ~1200ms. The two bounds together are the test -- either alone is passable
  // by a broken hook.
  expect(held, 'presence waited out the interrupted enter instead of the exit').toBeLessThan(
    ENTER_MS / 2,
  );
});

test('rapid open -> close -> open never unmounts the reopened node', async ({ page }) => {
  await openHarness(page);

  await page.click('#open');
  await page.click('#close');
  await page.click('#open');

  // Well past both the exit AND the interrupted enter: a stale wait from either
  // close would have landed by now.
  await page.waitForTimeout(ENTER_MS + EXIT_MS + 200);

  await expect(page.locator('#node')).toBeVisible();
  await expect(page.locator('#node')).toHaveAttribute('data-state', 'open');
  const result = await probe(page);
  expect(result.removedAt, 'a stale release unmounted the reopened node').toBeNull();
});

test('a zero-duration animation never reaches getAnimations, with no React involved', async ({
  page,
}) => {
  // THE PLATFORM FACT the reduced-motion case below rests on, isolated from the
  // hook so a failure here is unambiguous. Mechanism B (#2017) zeroes
  // `animation-duration` under prefers-reduced-motion and leaves the animation
  // ATTACHED -- computed style still names the keyframe. But a zero-duration
  // animation finishes inside the same style flush that creates it, which makes
  // it no longer relevant, and `getAnimations()` only reports relevant
  // animations. So the attached-ness is visible in CSS and invisible to the Web
  // Animations API, and any design that expects to await its `finished` is
  // awaiting a promise that was never handed out.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('about:blank');
  await page.setContent(`<style>
@keyframes probe-exit { from { opacity: 1 } to { opacity: 0 } }
#probe[data-state="closed"] { animation-name: probe-exit; animation-duration: 300ms; }
@media (prefers-reduced-motion: reduce) {
  #probe[data-state="closed"] { animation-duration: 0s; }
}
</style>
<div id="probe" data-state="open">content</div>`);

  const observed = await page.evaluate(() => {
    const node = document.getElementById('probe') as HTMLElement;
    node.setAttribute('data-state', 'closed');
    // Exactly the read presence performs, at exactly the same moment: right
    // after the state flip, before yielding.
    const running = node.getAnimations().length;
    const style = getComputedStyle(node);
    return { running, name: style.animationName, duration: style.animationDuration };
  });

  expect(observed.name, 'the animation was removed, not zeroed -- that is mechanism A').toBe(
    'probe-exit',
  );
  expect(observed.duration, 'reduced motion did not zero the duration').toBe('0s');
  expect(observed.running, 'a zero-duration animation is on the timeline after all').toBe(0);
});

test('a reduced-motion exit releases at once, with nothing left to wait for (#2017)', async ({
  page,
}) => {
  // The consequence for presence. There is no animation to observe (the test
  // above says why), so the empty-list path releases in the same tick -- which
  // is the right answer, not a bailout past something that was coming: a
  // zero-duration exit is over before a frame could paint it. This is the case
  // the OLD implementation had to special-case, because it released on
  // `animationend` and an event that had already fired would have wedged the
  // node until the backstop timer. Observing rather than listening removes the
  // special case instead of getting it right a second time.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openHarness(page);

  await page.click('#open');
  await page.click('#close');

  await page.waitForFunction(
    () => (window as unknown as { __presence: PresenceProbe }).__presence.removedAt !== null,
    null,
    { timeout: 5000 },
  );
  const result = await probe(page);

  expect(result.observedByHook, 'presence found something to await under reduced motion').toEqual(
    [],
  );
  const held = (result.removedAt ?? 0) - (result.closedAt ?? 0);
  expect(held, 'a zero-duration exit held the node for a perceptible beat').toBeLessThan(
    EXIT_MS / 2,
  );
});
