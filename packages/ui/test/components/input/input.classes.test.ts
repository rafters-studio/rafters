import { describe, expect, it } from 'vitest';
import { inputBehavior } from '../../../src/components/input/input.behavior';
import { inputClassSet } from '../../../src/components/input/input.classes';

const config = {};
const classes = inputClassSet(config, inputBehavior.initialState(config));

describe('input classes', () => {
  it('fills transparently and borders on a semantic token, never a page bg', () => {
    expect(classes.input).toContain('bg-transparent');
    expect(classes.input).toContain('border-input');
    expect(classes.input).not.toContain('bg-background');
  });

  it('styles validity off the projected aria-invalid', () => {
    expect(classes.input).toContain('aria-invalid:border-destructive');
    expect(classes.input).toContain('aria-invalid:focus-visible:ring-destructive-ring');
  });

  it('carries a token focus ring', () => {
    expect(classes.input).toContain('focus-visible:ring-2');
    expect(classes.input).toContain('focus-visible:ring-ring');
  });

  it('honors disabled and read-only affordances', () => {
    expect(classes.input).toContain('disabled:cursor-not-allowed');
    expect(classes.input).toContain('read-only:cursor-default');
  });

  it('motion respects reduced-motion', () => {
    expect(classes.input).toContain('motion-reduce:transition-none');
  });

  it('the error message uses the destructive text token', () => {
    expect(classes.error).toContain('text-destructive');
  });
});
