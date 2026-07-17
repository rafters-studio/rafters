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

  it('scrollbar transition honours reduced-motion', () => {
    expect(scrollBarBaseClasses).toContain('motion-reduce:transition-none');
  });

  it('the thumb uses the semantic border colour token', () => {
    expect(scrollBarThumbClasses).toContain('bg-border');
  });
});
