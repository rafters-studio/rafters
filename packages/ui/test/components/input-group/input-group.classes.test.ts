import { describe, expect, it } from 'vitest';
import {
  composeInputGroupAddonClasses,
  inputGroupClassSet,
} from '../../../src/components/input-group/input-group.classes';

const classes = inputGroupClassSet({}, {});

describe('input-group root decoration', () => {
  it('fills transparently and borders on a semantic token, never a page bg', () => {
    expect(classes.root).toContain('bg-transparent');
    expect(classes.root).toContain('border-input');
    expect(classes.root).not.toContain('bg-background');
  });

  it('carries the ONE focus ring for the whole assembly, as a focus-within ring', () => {
    expect(classes.root).toContain('focus-within:ring-2');
    expect(classes.root).toContain('focus-within:ring-ring');
    expect(classes.root).toContain('focus-within:ring-offset-2');
  });

  it('styles validity off the projected data-state', () => {
    expect(classes.root).toContain('data-[state=invalid]:border-destructive');
    expect(classes.root).toContain('data-[state=invalid]:focus-within:ring-destructive-ring');
  });

  it('dims off the authored data-disabled host signal', () => {
    expect(classes.root).toContain('data-[disabled]:opacity-50');
    expect(classes.root).toContain('data-[disabled]:cursor-not-allowed');
  });

  it('motion is the focus row alone, composed as generics (#2289)', () => {
    // root / focus -- ring -- duration-micro, ease-linear. The only row
    // input-group has, and `transition-shadow` is exactly the ring's property.
    expect(classes.root).toContain('transition-shadow');
    expect(classes.root).toContain('duration-micro');
    expect(classes.root).toContain('ease-linear');
    // The reduced-motion law is written once on the token leaves.
    expect(classes.root).not.toContain('motion-reduce:');
  });

  it('the invalid border snaps: input-group has no valid/invalid row (#2289)', () => {
    // input and textarea each carry a `valid <-> invalid` colour cell; this
    // component does not, so `border-color` stays out of the transition list.
    expect(classes.root).toContain('data-[state=invalid]:border-destructive');
    expect(classes.root).not.toContain('border-color');
  });
});

describe('input-group size vocabulary', () => {
  it('resolves each size to its height, defaulting when unset', () => {
    expect(inputGroupClassSet({ size: 'sm' }, {}).root).toContain('h-9');
    expect(inputGroupClassSet({ size: 'default' }, {}).root).toContain('h-10');
    expect(inputGroupClassSet({ size: 'lg' }, {}).root).toContain('h-11');
    expect(inputGroupClassSet({}, {}).root).toContain('h-10');
  });

  it('the small size uses the typography role token, never a raw text-sm', () => {
    const small = inputGroupClassSet({ size: 'sm' }, {}).root;
    expect(small).toContain('ts-body-small');
    expect(small).not.toContain('text-sm');
  });
});

describe('input-group control decoration', () => {
  it('renders no chrome of its own: the root owns border, radius, and ring', () => {
    expect(classes.control).toContain('border-0');
    expect(classes.control).toContain('rounded-[inherit]');
    expect(classes.control).toContain('focus:outline-none');
    expect(classes.control).not.toContain('border-input');
    expect(classes.control).not.toContain('focus-visible:ring-2');
  });

  it('fills transparently and uses the typography role token', () => {
    expect(classes.control).toContain('bg-transparent');
    expect(classes.control).toContain('ts-body-small');
  });

  it('honors the disabled affordance', () => {
    expect(classes.control).toContain('disabled:cursor-not-allowed');
    expect(classes.control).toContain('disabled:opacity-50');
  });
});

describe('input-group affix decoration', () => {
  it('never grows and never competes with the control for width', () => {
    expect(composeInputGroupAddonClasses('start')).toContain('shrink-0');
    expect(composeInputGroupAddonClasses('start')).toContain('text-muted-foreground');
  });

  it('puts the divider on the side facing the control', () => {
    expect(composeInputGroupAddonClasses('start')).toContain('border-r');
    expect(composeInputGroupAddonClasses('end')).toContain('border-l');
  });

  it('fills only on the filled variant', () => {
    expect(composeInputGroupAddonClasses('start', 'default')).toContain('bg-transparent');
    expect(composeInputGroupAddonClasses('start', 'filled')).toContain('bg-muted');
  });

  it('defaults the variant when omitted', () => {
    expect(composeInputGroupAddonClasses('end')).toBe(
      composeInputGroupAddonClasses('end', 'default'),
    );
  });
});
