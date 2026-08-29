import { describe, expect, it } from 'vitest';
import { spinnerClasses } from '../../../src/components/spinner/spinner.classes';

function root(config: Parameters<typeof spinnerClasses>[0]): string {
  return spinnerClasses(config, {}).root;
}

describe('spinner classes', () => {
  it('always carries the spinning ring cell utility, not the stock animate-spin', () => {
    const classes = root({});
    const tokens = classes.split(/\s+/);
    expect(classes).toContain('inline-block');
    expect(classes).toContain('rounded-full');
    expect(classes).toContain('animate-spinner-root-busy');
    // `animate-spinner-root-busy` itself contains the substring `animate-spin`,
    // so this must check for the OLD utility as a whole class token, not a
    // substring match.
    expect(tokens).not.toContain('animate-spin');
  });

  it('never stops spinning under reduced motion -- period cells are exempt', () => {
    // #2155: motion-reduce:animate-none is removed, not replaced. The loop
    // slows only if a designer retunes period-spin; reduced motion never
    // stops it (the compiled-layer guarantee lives at
    // packages/design-tokens/test/exporters/motion-utilities.test.ts, the
    // "reduced motion zeroes every tier-kind cell and no period-kind cell"
    // case).
    expect(root({})).not.toContain('motion-reduce:animate-none');
  });

  it('defaults to the default size and the primary variant ring', () => {
    const classes = root({});
    expect(classes).toContain('h-6 w-6 border-2');
    expect(classes).toContain('border-primary border-r-transparent');
  });

  it('size selects the ring box and stroke', () => {
    expect(root({ size: 'sm' })).toContain('h-4 w-4 border-2');
    expect(root({ size: 'lg' })).toContain('h-8 w-8 border-3');
  });

  it('variant colours the ring with a semantic role token and a transparent arc', () => {
    expect(root({ variant: 'destructive' })).toContain('border-destructive border-r-transparent');
    expect(root({ variant: 'success' })).toContain('border-success border-r-transparent');
    expect(root({ variant: 'muted' })).toContain('border-muted-foreground border-r-transparent');
  });

  it('never emits a raw arbitrary value', () => {
    expect(root({ size: 'lg', variant: 'info' })).not.toMatch(/\[[a-z0-9.#]+\]/);
  });
});
