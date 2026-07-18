import { describe, expect, it } from 'vitest';
import { textareaBehavior } from '../../../src/components/textarea/textarea.behavior';
import { textareaClassSet } from '../../../src/components/textarea/textarea.classes';

const config = {};
const classes = textareaClassSet(config, textareaBehavior.initialState(config));

describe('textarea classes', () => {
  it('fills transparently and borders on a semantic token, never a page bg', () => {
    expect(classes.textarea).toContain('bg-transparent');
    expect(classes.textarea).toContain('border-input');
    expect(classes.textarea).not.toContain('bg-background');
  });

  it('gives the multi-line control a min-height, not a fixed input height', () => {
    expect(classes.textarea).toContain('min-h-20');
    expect(classes.textarea).not.toContain('h-10');
  });

  it('styles validity off the projected aria-invalid', () => {
    expect(classes.textarea).toContain('aria-invalid:border-destructive');
    expect(classes.textarea).toContain('aria-invalid:focus-visible:ring-destructive-ring');
  });

  it('carries a token focus ring', () => {
    expect(classes.textarea).toContain('focus-visible:ring-2');
    expect(classes.textarea).toContain('focus-visible:ring-ring');
  });

  it('honors disabled and read-only affordances', () => {
    expect(classes.textarea).toContain('disabled:cursor-not-allowed');
    expect(classes.textarea).toContain('read-only:cursor-default');
  });

  it('motion respects reduced-motion', () => {
    expect(classes.textarea).toContain('motion-reduce:transition-none');
  });

  it('the error message uses the destructive text token', () => {
    expect(classes.error).toContain('text-destructive');
  });
});
