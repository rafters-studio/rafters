/**
 * Hover reveal WITH JAVASCRIPT DISABLED, in a real browser (#2148).
 *
 * WHAT THIS PROVES, AND WHAT IT DOES NOT. Read this before trusting it.
 *
 * Proven here, and only here:
 *  - tooltip, hover-card, and navigation-menu each reveal their content on a
 *    real pointer hover with `javaScriptEnabled: false` -- no `data-state` is
 *    ever written, because nothing is running to write one;
 *  - each one's OPEN cell resolves to the moderate duration, the enter curve,
 *    and the hover-intent delay, measured through computed style rather than
 *    asserted against the class string;
 *  - each one's CLOSE cell resolves to the fast duration and the exit curve,
 *    with NO delay for tooltip and navigation-menu and the LINGER for
 *    hover-card -- the asymmetry motion.jsonl assigns, and the drift the old
 *    JavaScript timers had against it;
 *  - the pointer can TRAVEL from trigger to tip across the real 4px sideOffset
 *    gap without the tip latching closed, and hover-card's panel is never
 *    opaque-and-inert during its linger -- the two things a reveal rule that
 *    owned `pointer-events` got wrong, and the two the rest of this file cannot
 *    see, because every other case hovers a filler INSIDE the root;
 *  - the WCAG 1.4.13 dismissal beats a still-matching `:hover`, which is the
 *    one thing specificity alone would get wrong.
 *
 * NOT proven here: that the `.classes.ts` CANDIDATES compile to these rules.
 * Tailwind emits nothing at all for a malformed candidate, silently, so the two
 * halves are pinned separately: the candidates are compiled through the real
 * Tailwind CLI and read back in packages/ui/test/motion/reveal-candidates.test.ts,
 * and the desugared rules are driven here. Nor is the React/Astro/WC wiring
 * proven here -- there is no dev server in this repo and a spec may not start
 * one, so this drives the CONTRACT'S DOM SHAPE against the rules, the way
 * test/presence/presence-exit.e2e.ts does for the presence contract.
 *
 * The CSS is not invented. Every custom property below is the design-tokens
 * output pinned by
 * packages/design-tokens/test/exporters/__snapshots__/motion-css-golden.test.ts.snap,
 * and every rule is the desugared form of a utility from that same emission, so
 * a retune that moved a cell off its tier would desync this file against the
 * golden rather than quietly passing.
 */
import { expect, test, type Page } from '@playwright/test';

/** Generated motion leaves, verbatim from the motion golden. */
const LEAVES = `
  --rafters-duration-fast: 150ms;
  --rafters-duration-moderate: 250ms;
  --rafters-ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --rafters-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --rafters-delay-hover-intent: 200ms;
  --rafters-delay-linger: 300ms;
`;

/** The computed values those leaves resolve to, as the browser reports them. */
const FAST = '0.15s';
const MODERATE = '0.25s';
const ENTER = 'cubic-bezier(0, 0, 0.2, 1)';
const EXIT = 'cubic-bezier(0.4, 0, 1, 1)';
const NO_DELAY = '0s';
const HOVER_INTENT = '0.2s';
const LINGER = '0.3s';

/**
 * The shape every one of these fixtures shares, spelled out once.
 *
 * `pointer-events` is on the base rule's TRANSITION LIST, with
 * `transition-behavior: allow-discrete`, and is NOT re-stated as a plain switch
 * by the reveal. That is the whole of the hoverable-content fix: a discrete
 * property flips at the transition's halfway point rather than instantly, so
 * the content stays hit-testable while it is still visible and the pointer can
 * cross the gap the positioner leaves between trigger and content. The reveal
 * rules re-state `transition-property: opacity` so the flip back to `auto` on
 * OPEN is immediate -- if they did not, the content would be un-enterable for
 * half of its own entrance.
 *
 * The `data-state="open"` path is a SEPARATE rule from the reveal, carrying the
 * open cell's duration and curve and NO delay: hover-intent filters accidental
 * pointer transit, and a consumer forcing `open` true has declared intent.
 */
const REVEALED = `
  opacity: 1;
  pointer-events: auto;
  transition-property: opacity;
  transition-duration: var(--rafters-duration-moderate);
  transition-timing-function: var(--rafters-ease-enter);
`;

/**
 * Tooltip. The base rule IS the open -> closed cell (fast, exit, no delay); the
 * reveal rule IS the closed -> open cell (moderate, enter, hover-intent).
 * Specificity is deliberate and mirrors the emission: base is one attribute
 * (what Tailwind emits as one class), the `data-state` path is two, the reveal
 * is four -- which is why the dismissal has to be important to win.
 */
const TOOLTIP_CSS = `
:root { ${LEAVES} }
[data-part="content"] {
  position: fixed;
  opacity: 0;
  pointer-events: none;
  transition-property: opacity, pointer-events;
  transition-behavior: allow-discrete;
  transition-duration: var(--rafters-duration-fast);
  transition-timing-function: var(--rafters-ease-exit);
}
:is(
  [data-tooltip]:has(> [data-part=trigger]:is(:hover, :focus-visible)),
  [data-tooltip]:not([data-disable-hoverable-content=true]):hover
) > [data-part="content"] {
  ${REVEALED}
  transition-delay: var(--rafters-delay-hover-intent);
}
[data-part="content"][data-state="open"] {
  ${REVEALED}
}
[data-tooltip][data-dismissed=true] > [data-part="content"] {
  opacity: 0 !important;
  pointer-events: none !important;
}
`;

const TOOLTIP = `
<style>
${TOOLTIP_CSS}
</style>
<div data-part="root" data-tooltip data-disable-hoverable-content="false">
  <button type="button" id="tip-trigger" data-part="trigger" data-state="closed"
          aria-describedby="tip-content">Help</button>
  <span id="tip-filler" style="display:inline-block;width:120px;height:40px">.</span>
  <div id="tip-content" data-part="content" role="tooltip" data-state="closed">More info</div>
</div>
<div data-part="root" data-tooltip data-disable-hoverable-content="false" data-dismissed="true">
  <button type="button" id="dismissed-trigger" data-part="trigger" data-state="closed">Help</button>
  <div id="dismissed-content" data-part="content" role="tooltip" data-state="closed">Gone</div>
</div>
<div data-part="root" data-tooltip data-disable-hoverable-content="true">
  <button type="button" id="strict-trigger" data-part="trigger" data-state="closed">Help</button>
  <span id="strict-filler" style="display:inline-block;width:120px;height:40px">.</span>
  <div id="strict-content" data-part="content" role="tooltip" data-state="closed">More info</div>
</div>
`;

/**
 * Hover-card. Identical shape to the tooltip, with the ONE difference the
 * matrix draws: its open -> closed cell carries `linger`, so the base rule has
 * a transition-delay where the tooltip's has none.
 */
const HOVER_CARD_CSS = `
:root { ${LEAVES} }
[data-part="content"] {
  position: fixed;
  opacity: 0;
  pointer-events: none;
  transition-property: opacity, pointer-events;
  transition-behavior: allow-discrete;
  transition-duration: var(--rafters-duration-fast);
  transition-timing-function: var(--rafters-ease-exit);
}
/* The linger is the CLOSE cell's, so it is scoped away from a forced-open card:
   the data-state path carries no delay of its own, and an unscoped linger here
   would become the 300ms a controlled open waits out. */
[data-part="content"]:not([data-state="open"]) {
  transition-delay: var(--rafters-delay-linger);
}
:is(
  [data-hover-card]:has(> [data-part=trigger]:is(:hover, :focus-visible)),
  [data-hover-card]:not([data-disable-hoverable-content=true]):hover
) > [data-part="content"] {
  ${REVEALED}
  transition-delay: var(--rafters-delay-hover-intent);
}
[data-part="content"][data-state="open"] {
  ${REVEALED}
}
[data-hover-card][data-dismissed=true] > [data-part="content"] {
  opacity: 0 !important;
  pointer-events: none !important;
}
`;

const HOVER_CARD = `
<style>
${HOVER_CARD_CSS}
</style>
<div data-part="root" data-hover-card data-disable-hoverable-content="false">
  <a href="/user/john" id="card-trigger" data-part="trigger" data-state="closed"
     aria-describedby="card-content">@john</a>
  <div id="card-content" data-part="content" role="dialog" aria-label="John Doe"
       data-state="closed">Software Engineer</div>
</div>
`;

/**
 * The REAL GEOMETRY, which every fixture above omits and which is where the
 * hoverable-content contract actually lives.
 *
 * On a JS-on page the collision-detector positions the content with
 * `position: fixed; left: 0; top: 0; transform: translate(x, y)` and a
 * `sideOffset` gap between anchor and content -- 4px by default
 * (tooltip.behavior.ts / hover-card.behavior.ts, `sideOffset: config.sideOffset ?? 4`).
 * Those 4px belong to neither box, so a pointer travelling from trigger to
 * content passes through a region where neither is hovered. Hovering a filler
 * INSIDE the root, which is all the cases above do, never crosses it.
 *
 * The gap is parameterised because the failure was gap-dependent: measured
 * against a reveal rule that owned pointer-events, 0px and 1px held and 4px and
 * 8px latched closed forever.
 */
const travelFixture = (css: string, marker: string, gap: number) => `
<style>
${css}
body { margin: 0; }
#travel-trigger { position: fixed; left: 40px; top: 40px; width: 90px; height: 24px; }
#travel-content { left: 40px; top: ${64 + gap}px; width: 180px; height: 60px; background: #333; }
</style>
<div data-part="root" ${marker} data-disable-hoverable-content="false">
  <button type="button" id="travel-trigger" data-part="trigger" data-state="closed"
          aria-describedby="travel-content">Help</button>
  <div id="travel-content" data-part="content" role="tooltip" data-state="closed">More info</div>
</div>
`;

/** Centre of the trigger, a point inside the gap, and centre of the content. */
const TRIGGER_POINT = { x: 85, y: 52 };
const gapPoint = (gap: number) => ({ x: 85, y: 64 + Math.max(gap - 1, 0) });
const contentPoint = (gap: number) => ({ x: 85, y: 64 + gap + 30 });

interface Reading {
  opacity: number;
  pointerEvents: string;
}

const read = async (page: Page, selector: string): Promise<Reading> =>
  page.locator(selector).evaluate((el) => {
    const style = getComputedStyle(el);
    return { opacity: Number(style.opacity), pointerEvents: style.pointerEvents };
  });

/**
 * Navigation-menu. The reveal scope is the ITEM, not the root: trigger and
 * panel are siblings inside it and the panel is flush against its bottom edge,
 * so the pointer never crosses a gap -- which matters, because this component's
 * close carries no linger to forgive a flicker. The `@media (hover: hover)`
 * guard on the hover half is Tailwind's own `group-hover` emission, verbatim; a
 * device with no hover reaches the panel through `data-state` instead.
 */
const NAVIGATION_MENU = `
<style>
:root { ${LEAVES} }
[data-part="content"] {
  position: absolute;
  left: 0;
  top: 100%;
  opacity: 0;
  pointer-events: none;
  transition-property: opacity, pointer-events;
  transition-behavior: allow-discrete;
  transition-duration: var(--rafters-duration-fast);
  transition-timing-function: var(--rafters-ease-exit);
}
@media (hover: hover) {
  [data-part="content"]:is(:where(.group\\/navigation-item):hover *) {
    ${REVEALED}
    transition-delay: var(--rafters-delay-hover-intent);
  }
}
[data-part="content"]:is(:where(.group\\/navigation-item):focus-within *) {
  ${REVEALED}
  transition-delay: var(--rafters-delay-hover-intent);
}
[data-part="content"][data-state="open"] {
  ${REVEALED}
}
[data-part="content"][data-dismissed=true] {
  opacity: 0 !important;
  pointer-events: none !important;
}
li { position: relative; list-style: none; }
/* The real list is a flex row (navigation-menu.classes.ts's listClasses), which
   is what keeps one item's absolutely-positioned panel clear of the next item's
   trigger. Stacked, the second trigger would sit on top of the first panel. */
[data-part="list"] { display: flex; gap: 8px; align-items: flex-start; margin: 0; padding: 0; }
</style>
<nav data-part="root" aria-label="Main navigation" data-state="closed">
  <ul data-part="list">
    <li class="group/navigation-item">
      <button type="button" id="nav-trigger" data-part="trigger" data-value="products"
              aria-expanded="false" aria-controls="nav-content">Products</button>
      <div id="nav-content" data-part="content" data-value="products"
           aria-labelledby="nav-trigger" data-state="closed"><a href="/one">One</a></div>
    </li>
    <li class="group/navigation-item">
      <button type="button" id="nav-trigger-two" data-part="trigger" data-value="company"
              aria-expanded="false" aria-controls="nav-content-two">Company</button>
      <div id="nav-content-two" data-part="content" data-value="company" data-dismissed="true"
           aria-labelledby="nav-trigger-two" data-state="closed"><a href="/two">Two</a></div>
    </li>
  </ul>
</nav>
`;

interface Cell {
  duration: string;
  curve: string;
  delay: string;
}

/** Split on top-level commas only: a timing function is `cubic-bezier(a, b, c,
 *  d)` and its own commas are not list separators. */
function splitTransitionList(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts;
}

/** The transition list now names TWO properties (opacity and pointer-events),
 *  and the engines serialise the per-property longhands differently: WebKit
 *  reports one entry per property (`0s, 0s`), Chromium and Firefox coalesce
 *  identical entries into one. Both say the same thing, so collapse the
 *  duplicates before comparing -- and keep the comparison strict about a list
 *  whose entries actually DIFFER, which would be a real cell error. */
const collapse = (value: string): string => [...new Set(splitTransitionList(value))].join(', ');

const computedProperty = async (page: Page, selector: string, property: string): Promise<string> =>
  page
    .locator(selector)
    .evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property);

/** Assert the whole motion cell -- never just the delay term. A delay and a
 *  slow close are different things and are not interchangeable in either
 *  direction, so every assertion below spells out all three. */
async function expectCell(page: Page, selector: string, cell: Cell): Promise<void> {
  const expected: Array<[string, string]> = [
    ['transition-duration', cell.duration],
    ['transition-timing-function', cell.curve],
    ['transition-delay', cell.delay],
  ];
  for (const [property, value] of expected) {
    await expect
      .poll(async () => collapse(await computedProperty(page, selector, property)), {
        message: `${selector} ${property}`,
      })
      .toBe(value);
  }
}

const CLOSED_NO_LINGER: Cell = { duration: FAST, curve: EXIT, delay: NO_DELAY };
const CLOSED_WITH_LINGER: Cell = { duration: FAST, curve: EXIT, delay: LINGER };
const OPEN: Cell = { duration: MODERATE, curve: ENTER, delay: HOVER_INTENT };

test.describe('hover reveal with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  test('tooltip: hover reveals; opens moderate/enter/hover-intent, closes fast/exit/NO delay', async ({
    page,
  }) => {
    await page.setContent(TOOLTIP);

    const content = page.locator('#tip-content');
    await expect(content).toHaveCSS('opacity', '0');
    // A tooltip does not linger. The close cell has no delay generic at all.
    await expectCell(page, '#tip-content', CLOSED_NO_LINGER);

    await page.hover('#tip-trigger');
    // Nothing wrote data-state -- there is no JavaScript to write one. This is
    // the stylesheet alone, over the tokens.
    await expect(content).toHaveAttribute('data-state', 'closed');
    await expect(content).toHaveCSS('opacity', '1');
    await expectCell(page, '#tip-content', OPEN);
  });

  test('tooltip: an Escape dismissal force-hides even while :hover still matches', async ({
    page,
  }) => {
    await page.setContent(TOOLTIP);
    await page.hover('#dismissed-trigger');
    // The reveal rule is one class-level MORE specific than the dismissal rule,
    // so only the important form can win here. This is the assertion that
    // catches a dismissal written without it.
    await expect(page.locator('#dismissed-content')).toHaveCSS('opacity', '0');
  });

  test('tooltip: disableHoverableContent narrows the reveal to the trigger', async ({ page }) => {
    // The discriminator is a hover that lands on the ROOT but not on the
    // trigger -- exactly the region the `:not([data-disable-hoverable-content
    // =true]):hover` half covers and the `:has(> trigger:hover)` half does not.
    // Both instances get an inert filler inside the root to hover.
    await page.setContent(TOOLTIP);

    // Default: the pointer may travel anywhere inside the root and hold the tip.
    await page.hover('#tip-filler');
    await expect(page.locator('#tip-content')).toHaveCSS('opacity', '1');

    // Disabled: the same gesture reveals nothing -- the reveal is the trigger's.
    await page.hover('#strict-filler');
    await expect(page.locator('#strict-content')).toHaveCSS('opacity', '0');

    // ...and the trigger itself still does reveal it, so the rule narrowed
    // rather than broke.
    await page.hover('#strict-trigger');
    await expect(page.locator('#strict-content')).toHaveCSS('opacity', '1');
  });

  test('hover-card: hover reveals; closes fast/exit WITH the linger', async ({ page }) => {
    await page.setContent(HOVER_CARD);

    const content = page.locator('#card-content');
    await expect(content).toHaveCSS('opacity', '0');
    // The one component of the three whose close carries a delay.
    await expectCell(page, '#card-content', CLOSED_WITH_LINGER);

    await page.hover('#card-trigger');
    await expect(content).toHaveAttribute('data-state', 'closed');
    await expect(content).toHaveCSS('opacity', '1');
    await expectCell(page, '#card-content', OPEN);
  });

  test('navigation-menu: hover reveals the panel; closes fast/exit/NO delay', async ({ page }) => {
    await page.setContent(NAVIGATION_MENU);

    const content = page.locator('#nav-content');
    await expect(content).toHaveCSS('opacity', '0');
    await expectCell(page, '#nav-content', CLOSED_NO_LINGER);

    await page.hover('#nav-trigger');
    // aria-expanded is still false: nothing is running to update it. The panel
    // is visible anyway, which is the whole point of the JS-off contract.
    await expect(page.locator('#nav-trigger')).toHaveAttribute('aria-expanded', 'false');
    await expect(content).toHaveCSS('opacity', '1');
    await expectCell(page, '#nav-content', OPEN);
  });

  test('navigation-menu: the panel stays revealed while the pointer is on it', async ({ page }) => {
    // Trigger and panel are siblings inside the item, and the panel sits flush
    // at the item's bottom edge -- so travelling onto it never leaves the hover
    // scope. There is no linger on this close to forgive it if it did.
    await page.setContent(NAVIGATION_MENU);
    await page.hover('#nav-trigger');
    await expect(page.locator('#nav-content')).toHaveCSS('opacity', '1');
    await page.hover('#nav-content a');
    await expect(page.locator('#nav-content')).toHaveCSS('opacity', '1');
  });

  test('navigation-menu: a dismissal hides ONE panel, not the whole bar', async ({ page }) => {
    // Root-scoped, the force-hide was a descendant rule over every panel in the
    // menu: one Escape blanked the lot. The flag is the dismissed panel's own.
    await page.setContent(NAVIGATION_MENU);
    await page.hover('#nav-trigger-two');
    await expect(page.locator('#nav-content-two')).toHaveCSS('opacity', '0');

    await page.hover('#nav-trigger');
    await expect(page.locator('#nav-content')).toHaveCSS('opacity', '1');
  });

  // Gaps the positioner really leaves. 0 and 1 held even against a reveal rule
  // that owned pointer-events; 4 (the default) and 8 latched closed forever.
  for (const gap of [0, 4, 8]) {
    test(`tooltip: the pointer travels across a ${gap}px sideOffset gap and the tip holds`, async ({
      page,
    }) => {
      await page.setContent(travelFixture(TOOLTIP_CSS, 'data-tooltip', gap));
      await page.mouse.move(TRIGGER_POINT.x, TRIGGER_POINT.y);
      await expect(page.locator('#travel-content')).toHaveCSS('opacity', '1');

      // A real traverse, not a teleport: the intermediate positions land in the
      // gap, where neither trigger nor content is hovered. If the tip stopped
      // being hit-testable there, arriving on it would hit the page behind it
      // and `:hover` could never return -- the latch this measures.
      const gapAt = gapPoint(gap);
      const contentAt = contentPoint(gap);
      await page.mouse.move(gapAt.x, gapAt.y, { steps: 4 });
      await page.mouse.move(contentAt.x, contentAt.y, { steps: 4 });

      await expect(page.locator('#travel-content')).toHaveCSS('opacity', '1');
      const settled = await read(page, '#travel-content');
      expect(settled.opacity).toBe(1);
      expect(settled.pointerEvents).toBe('auto');
    });
  }

  test('hover-card: the panel is never opaque and inert at the same time', async ({ page }) => {
    // The linger exists to forgive the pointer its near-miss on the way to the
    // panel. A panel that is `pointer-events: none` for the whole linger cannot
    // be re-entered, so it forgives nothing -- ~300ms of a fully opaque,
    // fully click-through preview. The invariant is the one a reader can check
    // by eye: what is visible is what accepts the pointer.
    await page.setContent(travelFixture(HOVER_CARD_CSS, 'data-hover-card', 4));
    await page.mouse.move(TRIGGER_POINT.x, TRIGGER_POINT.y);
    await expect(page.locator('#travel-content')).toHaveCSS('opacity', '1');

    await page.mouse.move(600, 600);
    const samples: Reading[] = [];
    const deadline = Date.now() + 900;
    while (Date.now() < deadline) samples.push(await read(page, '#travel-content'));

    const opaqueAndInert = samples.filter((s) => s.opacity > 0.5 && s.pointerEvents === 'none');
    expect(opaqueAndInert, 'visible but un-enterable -- the linger forgives nothing').toEqual([]);
    // ...and the sampling really did cover the linger, rather than starting late
    // and proving nothing.
    expect(
      samples.some((s) => s.opacity === 1 && s.pointerEvents === 'auto'),
      'never sampled the linger itself',
    ).toBe(true);
    // The other half: a rested, invisible panel does NOT keep eating clicks.
    const last = samples[samples.length - 1] as Reading;
    expect(last.opacity).toBe(0);
    expect(last.pointerEvents).toBe('none');
  });
});
