import { describe, expect, it } from 'vitest';
import { labelClasses, labelVariantClasses } from '../../../src/components/label/label.classes';

function root(config: Parameters<typeof labelClasses>[0]): string {
  return labelClasses(config, {}).root;
}

describe('label classes', () => {
  it('carries the label typography role token and the peer-disabled affordance', () => {
    const classes = root({});
    expect(classes).toContain('ts-label-medium');
    expect(classes).toContain('leading-none');
    expect(classes).toContain('peer-disabled:cursor-not-allowed');
    expect(classes).toContain('peer-disabled:opacity-70');
  });

  it('defaults to the foreground role token when no variant is given', () => {
    expect(root({})).toContain('text-foreground');
  });

  it('each variant resolves to its semantic text role token', () => {
    expect(root({ variant: 'destructive' })).toContain('text-destructive');
    expect(root({ variant: 'success' })).toContain('text-success');
    expect(root({ variant: 'muted' })).toContain('text-muted-foreground');
    expect(root({ variant: 'accent' })).toContain('text-accent');
  });

  it('exposes all nine semantic colour variants', () => {
    expect(Object.keys(labelVariantClasses)).toEqual([
      'default',
      'primary',
      'secondary',
      'destructive',
      'success',
      'warning',
      'info',
      'muted',
      'accent',
    ]);
  });

  it('never emits a raw colour utility -- semantic role tokens only', () => {
    for (const value of Object.values(labelVariantClasses)) {
      expect(value).toMatch(/^text-[a-z-]+$/);
    }
  });
});
