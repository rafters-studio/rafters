import { describe, expect, it } from 'vitest';
import { sheet, type SheetSide } from '../../../src/components/sheet/sheet.behavior';
import {
  sheetClasses,
  sheetContentClasses,
  sheetSideClasses,
} from '../../../src/components/sheet/sheet.classes';

const config = {};
const classes = sheetClasses(config, sheet.initialState(config));

describe('sheet classes', () => {
  it('layers sit on depth tokens', () => {
    expect(classes.overlay).toContain('z-depth-overlay');
    expect(sheetContentClasses('right')).toContain('z-depth-modal');
  });

  it('overlay fills the viewport with a semantic scrim fill', () => {
    expect(classes.overlay).toContain('fixed');
    expect(classes.overlay).toContain('inset-0');
    expect(classes.overlay).toContain('bg-foreground/80');
  });

  it('close button honors the touch floor and scales down via CQ', () => {
    expect(classes.close).toContain('h-11');
    expect(classes.close).toContain('@md:h-8');
    expect(classes.closeIcon).toContain('h-5');
    expect(classes.closeIcon).toContain('@md:h-4');
  });

  it('header and footer respond to the container, not the viewport', () => {
    expect(classes.header).toContain('@md:text-left');
    expect(classes.footer).toContain('@md:flex-row');
    expect(classes.header).not.toContain('sm:');
    expect(classes.footer).not.toContain('sm:');
  });

  it('the overlay consumes its own two cells, keyed off data-state', () => {
    // motion.jsonl: sheet / overlay / closed -> open is normal + enter, and
    // open -> closed is moderate + exit. Both rows carry provenance "proposed".
    expect(classes.overlay).toContain('data-[state=open]:animate-fade-in-normal-enter');
    expect(classes.overlay).toContain('data-[state=closed]:animate-fade-out-moderate-exit');
  });

  it('the content consumes the fade half of its rows on every side', () => {
    // motion.jsonl: sheet / content / closed -> open is normal + spring-smooth,
    // open -> closed is moderate + exit. Both declare `slide (per side) + fade`;
    // only the fade half is nameable, because the keyframe vocabulary has no
    // side-agnostic slide shape. The fade is side-independent, so it holds for
    // all four placements.
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const composed = sheetContentClasses(side);
      expect(composed).toContain('data-[state=open]:animate-fade-in-normal-spring-smooth');
      expect(composed).toContain('data-[state=closed]:animate-fade-out-moderate-exit');
    }
  });

  it('the close button names the curve its row assigns, not just the tier', () => {
    // motion.jsonl: sheet / close button / hover is fast + standard.
    expect(classes.close).toContain('duration-fast');
    expect(classes.close).toContain('ease-standard');
    expect(classes.close).not.toMatch(/\bduration-\d/);
  });

  it('reduced motion is not fought with animate-none on any animated part', () => {
    expect(classes.overlay).not.toContain('motion-reduce:animate-none');
    expect(sheetContentClasses('right')).not.toContain('motion-reduce:animate-none');
    // NO COMPONENT-LEVEL ESCAPE. Reduced motion is the token sheet's
    // responsibility, never a component-level media query (tooltip.classes.ts
    // states the law). The leaf-level block zeroes every duration and delay
    // leaf, so this transition is already 0 under reduce and the escape was
    // redundant. Asserted as ABSENT rather than deleted, so reintroducing one
    // fails here.
    expect(classes.close).not.toContain('motion-reduce:');
  });

  it('drops the oracle slide utilities and its raw slide durations', () => {
    // The overlay and the per-side content carry the motion the oracle animated;
    // the close button's duration-fast is a hover acknowledgment (Spec 04 keeps
    // those), so it is excluded from this scan. The slide utilities stay absent
    // because no slide keyframe exists to replace them, not because motion is
    // still pending -- the fade half of both content rows is consumed above.
    const motionSurfaces = `${classes.overlay} ${sheetContentClasses('right')}`;
    expect(motionSurfaces).not.toContain('animate-in');
    expect(motionSurfaces).not.toContain('animate-out');
    expect(motionSurfaces).not.toContain('slide-in');
    expect(motionSurfaces).not.toContain('slide-out');
    expect(motionSurfaces).not.toContain('duration-500');
    expect(motionSurfaces).not.toContain('duration-300');
  });
});

describe('sheet side variants', () => {
  const sides: SheetSide[] = ['top', 'right', 'bottom', 'left'];

  it('every side composes the shared base signature plus its own placement', () => {
    for (const side of sides) {
      const composed = sheetContentClasses(side);
      // Base signature (invariant across sides) sits on the modal depth token
      // and the panel fill; the placement segment is the side-specific tail.
      expect(composed).toContain('z-depth-modal');
      expect(composed).toContain('bg-background');
      expect(composed).toContain(sheetSideClasses[side]);
    }
  });

  it('left and right anchor the block axis edge and run full height', () => {
    expect(sheetSideClasses.left).toContain('left-0');
    expect(sheetSideClasses.left).toContain('h-full');
    expect(sheetSideClasses.left).toContain('border-r');
    expect(sheetSideClasses.right).toContain('right-0');
    expect(sheetSideClasses.right).toContain('h-full');
    expect(sheetSideClasses.right).toContain('border-l');
  });

  it('top and bottom span the inline axis and hug their edge', () => {
    expect(sheetSideClasses.top).toContain('top-0');
    expect(sheetSideClasses.top).toContain('inset-x-0');
    expect(sheetSideClasses.top).toContain('border-b');
    expect(sheetSideClasses.bottom).toContain('bottom-0');
    expect(sheetSideClasses.bottom).toContain('inset-x-0');
    expect(sheetSideClasses.bottom).toContain('border-t');
  });
});
