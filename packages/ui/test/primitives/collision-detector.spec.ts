/**
 * The shared placement path in a real browser (#2403): an anchored popup that
 * zooms (a transition covering `scale`, as the anchored-popup motion rows
 * assign) must not animate its placement, and a popup measured while scaled
 * down must be placed from the size it settles at.
 *
 * The transition is inline and names what Tailwind's `transition-transform`
 * names (`transform, translate, scale, rotate`); `transform-origin: top left`
 * keeps the zoom from moving the popup's top-left corner, so the corner's
 * on-screen position is the placement alone.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { positionPopover } from '../../src/components/popover/popover.behavior';
import { applyPosition } from '../../src/primitives/collision-detector';

const ZOOM_TRANSITION = 'transform, translate, scale, rotate';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function frames(count: number): Promise<void> {
  for (let i = 0; i < count; i++) await nextFrame();
}

function mountAnchor(css: string): HTMLElement {
  const anchor = document.createElement('button');
  anchor.type = 'button';
  anchor.textContent = 'Anchor';
  anchor.style.cssText = `margin: 0; padding: 0; border: 0; width: 100px; height: 30px; ${css}`;
  document.body.appendChild(anchor);
  return anchor;
}

function mountPopup(height: number): HTMLElement {
  const popup = document.createElement('div');
  popup.style.cssText = `position: fixed; left: 0; top: 0; width: 200px; height: ${height}px; margin: 0; transform-origin: top left;`;
  document.body.appendChild(popup);
  return popup;
}

/** The zoom transition, as `transition-transform` names it. */
function zoomTransition(popup: HTMLElement): void {
  popup.style.transitionProperty = ZOOM_TRANSITION;
  popup.style.transitionDuration = '10s';
  popup.style.transitionTimingFunction = 'linear';
}

/** The zoom's closed pose, committed as the transition's start. */
function closedPose(popup: HTMLElement): void {
  zoomTransition(popup);
  popup.style.scale = '0.5';
  popup.getBoundingClientRect();
}

const BELOW_START = { side: 'bottom', align: 'start', sideOffset: 4 } as const;

/**
 * Open a zooming popup against a fixed anchor and assert it sits at its
 * anchored position two frames later. `closedTransition` overrides the closed
 * pose's transition-property; the open edge always switches to the zoom's.
 */
async function expectFirstOpenInPlace(
  place: (anchor: HTMLElement, popup: HTMLElement) => void,
  closedTransition?: string,
): Promise<void> {
  const anchor = mountAnchor('position: fixed; left: 200px; top: 100px;');
  const popup = mountPopup(100);
  closedPose(popup);
  if (closedTransition) {
    popup.style.transitionProperty = closedTransition;
    popup.getBoundingClientRect();
  }

  popup.style.transitionProperty = ZOOM_TRANSITION;
  popup.style.scale = '1';
  place(anchor, popup);
  await frames(2);

  const rect = popup.getBoundingClientRect();
  expect(rect.left).toBeCloseTo(200, 0);
  expect(rect.top).toBeCloseTo(134, 0);
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.height = '';
  window.scrollTo(0, 0);
});

describe('anchored placement under a zoom transition', () => {
  it('positionPopover: the first open appears at its anchored position', async () => {
    await expectFirstOpenInPlace((anchor, popup) => positionPopover(anchor, popup, BELOW_START));
  });

  it('positionPopover: the drawer pattern (closed pose transition-all, open pose transition-transform) places without travel', async () => {
    await expectFirstOpenInPlace(
      (anchor, popup) => positionPopover(anchor, popup, BELOW_START),
      'all',
    );
  });

  it('applyPosition: the first open appears at its anchored position', async () => {
    await expectFirstOpenInPlace((anchor, popup) => {
      applyPosition(anchor, popup, BELOW_START);
    });
  });

  it('positionPopover: a scroll reposition follows the anchor without lag', async () => {
    document.body.style.height = '3000px';
    const anchor = mountAnchor('position: absolute; left: 200px; top: 300px;');
    const popup = mountPopup(100);

    // Settle the open popup first, then give it the zoom transition.
    positionPopover(anchor, popup, BELOW_START);
    await frames(2);
    zoomTransition(popup);
    popup.getBoundingClientRect();

    window.scrollTo(0, 150);
    positionPopover(anchor, popup, BELOW_START);
    await frames(2);

    const anchorRect = anchor.getBoundingClientRect();
    const rect = popup.getBoundingClientRect();
    expect(anchorRect.top).toBeCloseTo(150, 0);
    expect(rect.left).toBeCloseTo(anchorRect.left, 0);
    expect(rect.top).toBeCloseTo(anchorRect.bottom + 4, 0);
  });
});

describe('placement measures the unscaled size', () => {
  /** `scaleDown` holds the popup in the zoom's closed pose and returns the
   *  step that lets it settle at its open pose. */
  const forcedFlip = async (scaleDown: (popup: HTMLElement) => () => void) => {
    const anchor = mountAnchor(`position: fixed; left: 50px; top: ${window.innerHeight - 60}px;`);
    const popup = mountPopup(300);
    const settle = scaleDown(popup);
    expect(popup.getBoundingClientRect().height).toBeCloseTo(150, 0);

    positionPopover(anchor, popup, BELOW_START);

    settle();
    await frames(1);

    const anchorRect = anchor.getBoundingClientRect();
    const rect = popup.getBoundingClientRect();
    expect(popup.getAttribute('data-side')).toBe('top');
    expect(rect.height).toBeCloseTo(300, 0);
    expect(rect.bottom).toBeLessThanOrEqual(anchorRect.top + 0.5);
    expect(rect.bottom).toBeCloseTo(anchorRect.top - 4, 0);
  };

  it('a popup measured mid-zoom (scale property) flips to the top without overlapping the trigger', async () => {
    await forcedFlip((popup) => {
      popup.style.scale = '0.5';
      return () => {
        popup.style.scale = '';
      };
    });
  });

  it('a popup measured mid-zoom (transform: scale keyframe) flips to the top without overlapping the trigger', async () => {
    const keyframes = document.createElement('style');
    keyframes.textContent =
      '@keyframes placement-spec-zoom { from { transform: scale(0.5); } to { transform: scale(1); } }';
    document.body.appendChild(keyframes);
    await forcedFlip((popup) => {
      popup.style.animation = 'placement-spec-zoom 10s linear paused';
      return () => {
        popup.style.animation = '';
      };
    });
  });
});
