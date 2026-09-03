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

  it('enter/exit are the alert-dialog CELLS, keyed off data-state (#1996 / #2017)', () => {
    // motion.jsonl: alert-dialog / content / closed -> open is normal + enter,
    // and open -> closed is moderate + exit. Two distinct cells, two utilities.
    // The extent rides with the shape, so no extent-pop class appears here.
    expect(classes.content).toContain('data-[state=open]:animate-scale-in-normal-enter');
    expect(classes.content).toContain('data-[state=closed]:animate-scale-out-moderate-exit');
    expect(classes.content.split(/[\s:]+/)).not.toContain('extent-pop');
  });

  it('the overlay consumes its own two cells, keyed off data-state', () => {
    // motion.jsonl: alert-dialog / overlay / closed -> open is normal + enter,
    // and open -> closed is moderate + exit. Both carry provenance "proposed".
    expect(classes.overlay).toContain('data-[state=open]:animate-fade-in-normal-enter');
    expect(classes.overlay).toContain('data-[state=closed]:animate-fade-out-moderate-exit');
  });

  it('declares no raw numeric duration, and no animate-none escape', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\bduration-\d/);
      expect(value).not.toContain('motion-reduce:animate-none');
    }
  });

  it('the decision buttons carry no motion, because no matrix row assigns any', () => {
    // The modal-overlay section assigns a close-button hover row to dialog,
    // sheet and drawer. An alert dialog has no close button, and no row names
    // its action or cancel. A tier nobody assigned would be a value nobody
    // chose, so the hover stays instant.
    expect(classes.action).not.toContain('duration-');
    expect(classes.cancel).not.toContain('duration-');
  });
});
