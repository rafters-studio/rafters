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
 *  - the WCAG 1.4.13 dismissal beats a still-matching `:hover`, which is the
 *    one thing specificity alone would get wrong.
 *
 * NOT proven here: that the `.classes.ts` CANDIDATES compile to these rules.
 * Tailwind emits nothing at all for a malformed candidate, silently, so the two
 * halves are pinned separately and meet at the utility names: the candidate
 * strings in packages/ui/test/components/{tooltip,hover-card,navigation-menu}/
 * *.classes.test.ts, the desugared rules here. Nor is the React/Astro/WC wiring
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
 * Tooltip. The base rule IS the open -> closed cell (fast, exit, no delay); the
 * reveal rule IS the closed -> open cell (moderate, enter, hover-intent).
 * Specificity is deliberate and mirrors the emission: base is one attribute
 * (what Tailwind emits as one class), the `data-state` path is two, the reveal
 * is four -- which is why the dismissal has to be important to win.
 */
const TOOLTIP = `
<style>
:root { ${LEAVES} }
[data-part="content"] {
  position: fixed;
  opacity: 0;
  pointer-events: none;
  transition-property: opacity;
  transition-duration: var(--rafters-duration-fast);
  transition-timing-function: var(--rafters-ease-exit);
}
:is(
  [data-tooltip]:has(> [data-part=trigger]:is(:hover, :focus-visible)),
  [data-tooltip]:not([data-disable-hoverable-content=true]):hover
) > [data-part="content"],
[data-part="content"][data-state="open"] {
  opacity: 1;
  pointer-events: auto;
  transition-duration: var(--rafters-duration-moderate);
  transition-timing-function: var(--rafters-ease-enter);
  transition-delay: var(--rafters-delay-hover-intent);
}
[data-tooltip][data-dismissed=true] > [data-part="content"] {
  opacity: 0 !important;
  pointer-events: none !important;
}
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
const HOVER_CARD = `
<style>
:root { ${LEAVES} }
[data-part="content"] {
  position: fixed;
  opacity: 0;
  pointer-events: none;
  transition-property: opacity;
  transition-duration: var(--rafters-duration-fast);
  transition-timing-function: var(--rafters-ease-exit);
  transition-delay: var(--rafters-delay-linger);
}
:is(
  [data-hover-card]:has(> [data-part=trigger]:is(:hover, :focus-visible)),
  [data-hover-card]:not([data-disable-hoverable-content=true]):hover
) > [data-part="content"],
[data-part="content"][data-state="open"] {
  opacity: 1;
  pointer-events: auto;
  transition-duration: var(--rafters-duration-moderate);
  transition-timing-function: var(--rafters-ease-enter);
  transition-delay: var(--rafters-delay-hover-intent);
}
[data-hover-card][data-dismissed=true] > [data-part="content"] {
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
<div data-part="root" data-hover-card data-disable-hoverable-content="false">
  <a href="/user/john" id="card-trigger" data-part="trigger" data-state="closed"
     aria-describedby="card-content">@john</a>
  <div id="card-content" data-part="content" role="dialog" aria-label="John Doe"
       data-state="closed">Software Engineer</div>
</div>
`;

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
  transition-property: opacity;
  transition-duration: var(--rafters-duration-fast);
  transition-timing-function: var(--rafters-ease-exit);
}
@media (hover: hover) {
  [data-part="content"]:is(:where(.group\\/navigation-item):hover *) {
    opacity: 1;
    pointer-events: auto;
    transition-duration: var(--rafters-duration-moderate);
    transition-timing-function: var(--rafters-ease-enter);
    transition-delay: var(--rafters-delay-hover-intent);
  }
}
[data-part="content"]:is(:where(.group\\/navigation-item):focus-within *),
[data-part="content"][data-state="open"] {
  opacity: 1;
  pointer-events: auto;
  transition-duration: var(--rafters-duration-moderate);
  transition-timing-function: var(--rafters-ease-enter);
  transition-delay: var(--rafters-delay-hover-intent);
}
[data-part=root][data-dismissed=true] [data-part="content"] {
  opacity: 0 !important;
  pointer-events: none !important;
}
li { position: relative; list-style: none; }
</style>
<nav data-part="root" aria-label="Main navigation" data-state="closed">
  <ul data-part="list">
    <li class="group/navigation-item">
      <button type="button" id="nav-trigger" data-part="trigger" data-value="products"
              aria-expanded="false" aria-controls="nav-content">Products</button>
      <div id="nav-content" data-part="content" data-value="products"
           aria-labelledby="nav-trigger" data-state="closed"><a href="/one">One</a></div>
    </li>
  </ul>
</nav>
`;

interface Cell {
  duration: string;
  curve: string;
  delay: string;
}

/** Assert the whole motion cell -- never just the delay term. A delay and a
 *  slow close are different things and are not interchangeable in either
 *  direction, so every assertion below spells out all three. */
async function expectCell(page: Page, selector: string, cell: Cell): Promise<void> {
  const content = page.locator(selector);
  await expect(content).toHaveCSS('transition-duration', cell.duration);
  await expect(content).toHaveCSS('transition-timing-function', cell.curve);
  await expect(content).toHaveCSS('transition-delay', cell.delay);
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
});
