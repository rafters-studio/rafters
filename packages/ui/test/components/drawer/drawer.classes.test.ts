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

  it('declares no raw numeric enter/exit motion (motion-sheet-in is pending)', () => {
    const classes = classesFor();
    expect(classes.content).not.toContain('animate-in');
    expect(classes.content).not.toMatch(/duration-\d/);
    expect(classes.content).not.toContain('slide-in');
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

  it('motion respects reduced-motion', () => {
    expect(classesFor().close).toContain('motion-reduce:transition-none');
  });
});
