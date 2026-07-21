import { describe, expect, it } from 'vitest';
import { alertDialog } from '../../../src/components/alert-dialog/alert-dialog.behavior';
import { alertDialogClasses } from '../../../src/components/alert-dialog/alert-dialog.classes';

const config = {};
const classes = alertDialogClasses(config, alertDialog.initialState(config));

describe('alert-dialog classes', () => {
  it('layers sit on depth tokens', () => {
    expect(classes.overlay).toContain('z-depth-overlay');
    expect(classes.container).toContain('z-depth-modal');
  });

  it('the action button carries the destructive intent', () => {
    expect(classes.action).toContain('bg-destructive');
    expect(classes.action).toContain('text-destructive-foreground');
  });

  it('the cancel button reads as the neutral, outlined choice', () => {
    expect(classes.cancel).toContain('border-input');
    expect(classes.cancel).not.toContain('bg-destructive');
  });

  it('both decision buttons honor the touch floor and the focus ring', () => {
    expect(classes.action).toContain('h-11');
    expect(classes.cancel).toContain('h-11');
    expect(classes.action).toContain('focus-visible:ring-ring');
    expect(classes.cancel).toContain('focus-visible:ring-ring');
  });

  it('header and footer respond to the container, not the viewport', () => {
    expect(classes.header).toContain('@md:text-left');
    expect(classes.footer).toContain('@md:flex-row');
    expect(classes.header).not.toContain('sm:');
    expect(classes.footer).not.toContain('sm:');
  });

  it('declares no raw numeric transition duration (motion token layer pending)', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\bduration-\d/);
    }
  });
});
