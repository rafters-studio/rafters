import { describe, expect, it } from 'vitest';
import { dialog } from '../../../src/components/dialog/dialog.behavior';
import { dialogClasses } from '../../../src/components/dialog/dialog.classes';

const config = {};
const classes = dialogClasses(config, dialog.initialState(config));

describe('dialog classes', () => {
  it('layers sit on depth tokens', () => {
    expect(classes.overlay).toContain('z-depth-overlay');
    expect(classes.container).toContain('z-depth-modal');
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

  it('enter/exit are the dialog CELLS, keyed off data-state (#1996 / #2017)', () => {
    // motion.jsonl: dialog / content / closed -> open is normal + enter, and
    // open -> closed is moderate + exit. Two distinct cells, two utilities --
    // not one shared animation standing in for both (the #2012 defect).
    expect(classes.content).toContain('data-[state=open]:animate-dialog-content-open');
    expect(classes.content).toContain('data-[state=closed]:animate-dialog-content-close');
    expect(classes.content).not.toContain('animate-scale-in');
    expect(classes.content).not.toContain('animate-scale-out');
  });

  it('motion respects reduced-motion, and does NOT do it with animate-none', () => {
    // Mechanism B (#2017): the cell utility zeroes animation-duration under the
    // media query. animate-none here would win destructively -- `animation:
    // none` resets the shorthand and discards the zeroed duration -- and would
    // leave the element short of the keyframe's end state.
    expect(classes.content).not.toContain('motion-reduce:animate-none');
    expect(classes.close).toContain('motion-reduce:transition-none');
  });
});
