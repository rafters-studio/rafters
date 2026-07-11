import { describe, expect, it } from 'vitest';
import { skeletonClasses } from '../../../src/components/skeleton/skeleton.classes';

describe('skeleton classes', () => {
  it('defaults to the muted surface with the pulse animation', () => {
    const root = skeletonClasses({}, {}).root;
    expect(root).toContain('bg-muted');
    expect(root).toContain('animate-pulse');
    expect(root).toContain('motion-reduce:animate-none');
  });

  it('every color variant resolves to a SUBTLE surface, never a solid one', () => {
    const variants = [
      'primary',
      'secondary',
      'destructive',
      'success',
      'warning',
      'info',
      'accent',
    ] as const;
    for (const variant of variants) {
      const root = skeletonClasses({ variant }, {}).root;
      expect(root).toContain(`bg-${variant}-subtle`);
      expect(root).not.toContain(`bg-${variant} `);
    }
  });

  it('never emits a paired foreground class -- the part renders no text', () => {
    const root = skeletonClasses({ variant: 'primary' }, {}).root;
    expect(root).not.toContain('foreground');
  });

  it('muted variant is the same literal as default', () => {
    expect(skeletonClasses({ variant: 'muted' }, {}).root).toBe(
      skeletonClasses({ variant: 'default' }, {}).root,
    );
  });
});
