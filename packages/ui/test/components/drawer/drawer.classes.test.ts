import { describe, expect, it } from 'vitest';
import { drawer } from '../../../src/components/drawer/drawer.behavior';
import { drawerClasses } from '../../../src/components/drawer/drawer.classes';

const state = drawer.initialState({});
const classesFor = (side?: 'top' | 'right' | 'bottom' | 'left') =>
  drawerClasses(side ? { side } : {}, state);

describe('drawer classes', () => {
  it('layers sit on depth tokens', () => {
    const classes = classesFor();
    expect(classes.overlay).toContain('z-depth-overlay');
    expect(classes.content).toContain('z-depth-modal');
  });

  it('defaults to the bottom edge: slides up, rounded top, top border', () => {
    const classes = classesFor();
    expect(classes.content).toContain('bottom-0');
    expect(classes.content).toContain('rounded-t-lg');
    expect(classes.content).toContain('border-t');
  });

  it('anchors the panel to the configured edge', () => {
    expect(classesFor('top').content).toContain('top-0');
    expect(classesFor('top').content).toContain('border-b');
    expect(classesFor('left').content).toContain('left-0');
    expect(classesFor('left').content).toContain('border-r');
    expect(classesFor('right').content).toContain('right-0');
    expect(classesFor('right').content).toContain('border-l');
  });

  it('side-anchored panels take a token fill, never a background utility', () => {
    expect(classesFor().content).toContain('bg-background');
    expect(classesFor().content).not.toContain('bg-white');
  });

  it('the content declares no enter/exit motion, because no slide shape exists', () => {
    // motion.jsonl assigns drawer / content / closed -> open (normal,
    // spring-smooth) and open -> closed (moderate, exit), both `slide (y)` over
    // `transform: translate` alone. The keyframe vocabulary has no slide shape,
    // and unlike sheet these rows declare no fade half, so there is nothing to
    // name. An approximated shape would be geometry nobody chose.
    const classes = classesFor();
    expect(classes.content).not.toContain('animate-in');
    expect(classes.content).not.toMatch(/duration-\d/);
    expect(classes.content).not.toContain('slide-in');
    expect(classes.content).not.toContain('animate-');
  });

  it('the content carries no settle transition, because it never settles', () => {
    // motion.jsonl assigns drawer / content / settle on release (fast,
    // spring-smooth, provenance "proposed"). That row is nameable as composed
    // generics, but the drag-to-dismiss gesture is deferred and the handle is
    // decorative, so the panel never travels to a snap point. A settle
    // transition on a panel that never settles would animate nothing.
    const classes = classesFor();
    expect(classes.content).not.toContain('ease-spring-smooth');
    expect(classes.content).not.toContain('duration-fast');
  });

  it('the overlay consumes its own two cells, keyed off data-state', () => {
    // motion.jsonl: drawer / overlay / closed -> open is normal + enter, and
    // open -> closed is moderate + exit. Both carry provenance "proposed".
    const classes = classesFor();
    expect(classes.overlay).toContain('data-[state=open]:animate-fade-in-normal-enter');
    expect(classes.overlay).toContain('data-[state=closed]:animate-fade-out-moderate-exit');
  });

  it('the close button names the curve its row assigns, not just the tier', () => {
    // motion.jsonl: drawer / close button / hover is fast + standard.
    const classes = classesFor();
    expect(classes.close).toContain('duration-fast');
    expect(classes.close).toContain('ease-standard');
    expect(classes.close).not.toMatch(/\bduration-\d/);
  });

  it('the grab handle is a decorative token-filled affordance', () => {
    const classes = classesFor();
    expect(classes.handle).toContain('bg-muted');
    expect(classes.handle).toContain('rounded-full');
  });

  it('close button honors the touch floor and scales down via CQ', () => {
    const classes = classesFor();
    expect(classes.close).toContain('h-11');
    expect(classes.close).toContain('@md:h-8');
    expect(classes.closeIcon).toContain('h-5');
    expect(classes.closeIcon).toContain('@md:h-4');
  });

  it('header and footer respond to the container, not the viewport', () => {
    const classes = classesFor();
    expect(classes.header).toContain('@md:text-left');
    expect(classes.header).not.toContain('sm:');
    expect(classes.footer).not.toContain('sm:');
  });

  it('motion respects reduced-motion, and does NOT do it with animate-none', () => {
    // NO COMPONENT-LEVEL ESCAPE. Reduced motion is the token sheet's
    // responsibility, never a component-level media query (tooltip.classes.ts
    // states the law). The leaf-level block zeroes every duration and delay
    // leaf, so this transition is already 0 under reduce and the escape was
    // redundant. Asserted as ABSENT rather than deleted, so reintroducing one
    // fails here.
    expect(classesFor().close).not.toContain('motion-reduce:');
    expect(classesFor().overlay).not.toContain('motion-reduce:animate-none');
  });
});
