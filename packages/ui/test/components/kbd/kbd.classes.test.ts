import { describe, expect, it } from 'vitest';
import { kbdBaseClasses, kbdClasses } from '../../../src/components/kbd/kbd.classes';

function root(config: Parameters<typeof kbdClasses>[0]): string {
  return kbdClasses(config, {}).root;
}

describe('kbd classes', () => {
  it('is the semantic cap: inline chip, border, muted surface, code type scale', () => {
    const classes = root({});
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('rounded');
    expect(classes).toContain('border border-border');
    expect(classes).toContain('bg-muted');
    expect(classes).toContain('text-code-small');
    expect(classes).toContain('text-muted-foreground');
    expect(classes).toContain('shadow-sm');
  });

  it('projects the base cap string -- no variants, config-independent', () => {
    expect(root({})).toBe(kbdBaseClasses);
  });

  it('never emits a raw arbitrary value', () => {
    expect(root({})).not.toMatch(/\[[a-z0-9.#]+\]/);
  });
});
