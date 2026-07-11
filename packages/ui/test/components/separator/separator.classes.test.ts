import { describe, expect, it } from 'vitest';
import { separatorClasses } from '../../../src/components/separator/separator.classes';

function root(config: Parameters<typeof separatorClasses>[0]): string {
  return separatorClasses(config, {}).root;
}

describe('separator classes', () => {
  it('horizontal (default): a full-width hairline', () => {
    const cls = root({});
    expect(cls).toContain('h-px w-full');
    expect(cls).toContain('bg-border');
    expect(cls).toContain('shrink-0');
  });

  it('vertical: a full-height hairline', () => {
    const cls = root({ orientation: 'vertical' });
    expect(cls).toContain('h-full w-px');
    expect(cls).not.toContain('h-px w-full');
  });

  it('decorative has no effect on decoration -- it is an aria-only knob', () => {
    expect(root({ decorative: false })).toBe(root({ decorative: true }));
  });
});
