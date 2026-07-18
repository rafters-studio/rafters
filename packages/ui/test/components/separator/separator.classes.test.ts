import { describe, expect, it } from 'vitest';
import { separatorClasses } from '../../../src/components/separator/separator.classes';

function root(config: Parameters<typeof separatorClasses>[0]): string {
  return separatorClasses(config, {}).root;
}

describe('separator classes', () => {
  it('always carries the structural base and the border-token fill', () => {
    const classes = root({});
    expect(classes).toContain('shrink-0');
    expect(classes).toContain('bg-border');
  });

  it('defaults to a horizontal rule: 1px tall, full width', () => {
    const classes = root({});
    expect(classes).toContain('h-px w-full');
  });

  it('vertical flips the thin axis: 1px wide, full height', () => {
    const classes = root({ orientation: 'vertical' });
    expect(classes).toContain('h-full w-px');
    expect(classes).not.toContain('h-px w-full');
  });

  it('decorative does not change the visual class selection', () => {
    expect(root({ decorative: false })).toBe(root({ decorative: true }));
  });

  it('never emits a raw arbitrary value or a color utility', () => {
    expect(root({})).not.toMatch(/\[[a-z0-9.#]+\]/);
  });
});
