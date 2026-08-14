import { describe, expect, it } from 'vitest';
import {
  breadcrumbEllipsisClasses,
  breadcrumbItemClasses,
  breadcrumbLinkClasses,
  breadcrumbListClasses,
  breadcrumbPageClasses,
  breadcrumbSeparatorClasses,
} from '../../../src/components/breadcrumb/breadcrumb.classes';

describe('breadcrumb classes', () => {
  it('the list uses the muted label-text token pairing and wraps', () => {
    expect(breadcrumbListClasses).toBe(
      'flex flex-wrap items-center gap-1.5 break-words ts-label-medium text-muted-foreground @sm:gap-2.5',
    );
  });

  it('the item is an inline flex row with a token gap', () => {
    expect(breadcrumbItemClasses).toBe('inline-flex items-center gap-1.5');
  });

  it('the link carries the sole motion intent (hover colour) plus a focus ring', () => {
    expect(breadcrumbLinkClasses).toContain('transition-colors');
    expect(breadcrumbLinkClasses).toContain('motion-reduce:transition-none');
    expect(breadcrumbLinkClasses).toContain('hover:text-foreground');
    expect(breadcrumbLinkClasses).toContain('focus-visible:ring-2');
  });

  it('the current page reads with the foreground token, not muted', () => {
    expect(breadcrumbPageClasses).toBe('text-foreground');
  });

  it('the separator sizes its icon; the ellipsis centres its glyph', () => {
    expect(breadcrumbSeparatorClasses).toBe('[&>svg]:size-3.5');
    expect(breadcrumbEllipsisClasses).toBe('flex h-9 w-9 items-center justify-center');
  });

  it('never emits a raw colour/spacing arbitrary value', () => {
    // Semantic tokens only; the one bracketed utility is a variant selector
    // ([&>svg]:size-3.5), not an arbitrary colour/length value.
    for (const cls of [
      breadcrumbListClasses,
      breadcrumbItemClasses,
      breadcrumbLinkClasses,
      breadcrumbPageClasses,
    ]) {
      expect(cls).not.toMatch(/\[[a-z0-9.#]+\]/);
    }
  });
});
