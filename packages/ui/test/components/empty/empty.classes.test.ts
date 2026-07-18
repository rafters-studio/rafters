import { describe, expect, it } from 'vitest';
import {
  emptyActionClasses,
  emptyClasses,
  emptyDescriptionClasses,
  emptyIconClasses,
  emptyTitleClasses,
} from '../../../src/components/empty/empty.classes';

function root(): string {
  return emptyClasses({}, {}).root;
}

describe('empty classes', () => {
  it('is a centered column that owns its own vertical breathing room', () => {
    const classes = root();
    expect(classes).toContain('flex flex-col');
    expect(classes).toContain('items-center');
    expect(classes).toContain('justify-center');
    expect(classes).toContain('gap-4');
    expect(classes).toContain('py-12');
    expect(classes).toContain('text-center');
  });

  it('carries no surface colour -- the placeholder is fill, not background', () => {
    expect(root()).not.toContain('bg-');
  });

  it('never emits a raw arbitrary value on the root', () => {
    expect(root()).not.toMatch(/\[[a-z0-9.#]+\]/);
  });

  it('sub-part classes are config-independent literals', () => {
    expect(emptyIconClasses).toBe('text-muted-foreground [&>svg]:h-12 [&>svg]:w-12');
    expect(emptyTitleClasses).toBe('text-title-medium text-foreground');
    expect(emptyDescriptionClasses).toBe('max-w-sm text-body-small text-muted-foreground');
    expect(emptyActionClasses).toBe('');
  });
});
