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

  it('motion respects reduced-motion', () => {
    expect(classes.close).toContain('motion-reduce:transition-none');
  });
});
