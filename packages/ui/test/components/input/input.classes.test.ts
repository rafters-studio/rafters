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

  it('motion is the focus row and the validity row, composed as generics (#2288)', () => {
    // root / focus -- ring -- duration-micro, ease-linear
    expect(classes.input).toContain('transition-[box-shadow,border-color]');
    expect(classes.input).toContain('duration-micro');
    expect(classes.input).toContain('ease-linear');
    // root / valid <-> invalid -- color -- duration-fast, ease-standard
    expect(classes.input).toContain('aria-invalid:duration-fast');
    expect(classes.input).toContain('aria-invalid:ease-standard');
    // The reduced-motion law is written once on the token leaves; a
    // component-level escape fights it, so there is none to find here.
    expect(classes.input).not.toContain('motion-reduce:');
  });

  it('the error message uses the destructive text token', () => {
    expect(classes.error).toContain('text-destructive');
  });
});
