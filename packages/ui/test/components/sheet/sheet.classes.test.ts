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

  it('motion respects reduced-motion on the only declared transition', () => {
    expect(classes.close).toContain('motion-reduce:transition-none');
  });

  it('drops the oracle slide utilities and its raw slide durations (motion tokens pending)', () => {
    // The overlay and the per-side content carry the motion the oracle animated;
    // the close button's duration-150 is a hover acknowledgment (Spec 04 keeps
    // those), so it is excluded from this scan.
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
