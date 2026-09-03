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
      'flex flex-wrap items-center gap-1.5 break-words text-label-medium ts-label-medium text-muted-foreground @sm:gap-2.5',
    );
  });

  it('the item is an inline flex row with a token gap', () => {
    expect(breadcrumbItemClasses).toBe('inline-flex items-center gap-1.5');
  });

  it('the link carries the sole motion intent (hover colour) plus a focus ring', () => {
    expect(breadcrumbLinkClasses).toContain('transition-colors');
    // Reduced motion is the token sheet's job, never the component's: the
    // generated duration-*/delay-* utilities zero themselves under
    // prefers-reduced-motion (REDUCED_MOTION_ZEROED in the tailwind
    // exporter). Its ABSENCE is the assertion -- the tripwire against
    // reintroducing a component-level escape.
    expect(breadcrumbLinkClasses).not.toContain('motion-reduce:');
    expect(breadcrumbLinkClasses).toContain('hover:text-foreground');
    expect(breadcrumbLinkClasses).toContain('focus-visible:ring-2');
  });

  // `breadcrumb / link / hover`: a colour change on a link that stays put, so
  // a transition named as composed generics -- tier `fast`, curve role
  // `standard`, no literal timing.
  it('the link hover consumes the tier and curve the matrix assigns', () => {
    expect(breadcrumbLinkClasses).toContain('duration-fast');
    expect(breadcrumbLinkClasses).toContain('ease-standard');
    expect(breadcrumbLinkClasses).not.toMatch(/duration-\d/);
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
