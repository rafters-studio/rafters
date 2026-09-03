import { describe, expect, it } from 'vitest';
import {
  scrollAreaClasses,
  scrollBarBaseClasses,
  scrollBarClasses,
  scrollBarThumbClasses,
} from '../../../src/components/scroll-area/scroll-area.classes';

function root(config: Parameters<typeof scrollAreaClasses>[0]): string {
  return scrollAreaClasses(config, {}).root;
}

describe('scroll-area classes', () => {
  it('always carries the base surface plus the custom WebKit scrollbar', () => {
    const classes = root({});
    expect(classes).toContain('h-full w-full');
    expect(classes).toContain('rounded-sm');
    expect(classes).toContain('[&::-webkit-scrollbar]:w-2.5');
    expect(classes).toContain('[&::-webkit-scrollbar-thumb]:bg-border');
    expect(classes).toContain('[&::-webkit-scrollbar-track]:bg-transparent');
  });

  it('defaults to vertical overflow', () => {
    expect(root({})).toContain('overflow-y-auto overflow-x-hidden');
  });

  it('horizontal orientation flips the overflow axis', () => {
    const classes = root({ orientation: 'horizontal' });
    expect(classes).toContain('overflow-x-auto overflow-y-hidden');
    expect(classes).not.toContain('overflow-y-auto');
  });

  it('both is the rafters extension -- overflow on both axes', () => {
    const classes = root({ orientation: 'both' });
    expect(classes).toContain('overflow-auto');
    expect(classes).not.toContain('overflow-x-hidden');
    expect(classes).not.toContain('overflow-y-hidden');
  });

  it('the decorative scrollbar draws from one shared source', () => {
    const vertical = scrollBarClasses('vertical');
    expect(vertical.bar).toContain(scrollBarBaseClasses);
    expect(vertical.bar).toContain('w-2.5');
    expect(vertical.bar).toContain('border-l');
    expect(vertical.thumb).toBe(scrollBarThumbClasses);

    const horizontal = scrollBarClasses('horizontal');
    expect(horizontal.bar).toContain('h-2.5');
    expect(horizontal.bar).toContain('flex-col');
    expect(horizontal.bar).toContain('border-t');
  });

  it('the scrollbar hover carries its row: color, fast, standard', () => {
    // motion.jsonl scroll-area / scrollbar / "hover". The curve was missing
    // before; motion-reduce is gone because the law is written on the leaves.
    expect(scrollBarBaseClasses).toContain('transition-colors');
    expect(scrollBarBaseClasses).toContain('duration-fast');
    expect(scrollBarBaseClasses).toContain('ease-standard');
    expect(scrollBarBaseClasses).not.toContain('motion-reduce');
  });

  it('the thumb consumes the pointer rule by absence', () => {
    // While the pointer drives the thumb it must track it exactly; any nonzero
    // duration is a defect, so there is no transition utility here at all.
    expect(scrollBarThumbClasses).not.toMatch(/\b(transition|duration|ease|animate)-/);
  });

  it('leaves the proposed show/hide rows unconsumed rather than inventing a trigger', () => {
    // ScrollArea is the static archetype -- no state, an empty aria projection,
    // and a bar that is always visible. Deciding what reveals a scrollbar is a
    // design decision no row makes. Reported on #2299.
    expect(scrollBarBaseClasses).not.toContain('animate-');
    expect(scrollBarBaseClasses).not.toContain('delay-linger');
  });

  it('states no timing as a literal', () => {
    for (const value of [scrollBarBaseClasses, scrollBarThumbClasses, root({})]) {
      expect(value).not.toMatch(/\b(duration|delay)-\d/);
      expect(value).not.toContain('motion-reduce');
    }
  });

  it('the thumb uses the semantic border colour token', () => {
    expect(scrollBarThumbClasses).toContain('bg-border');
  });
});
