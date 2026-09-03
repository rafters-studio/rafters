import { describe, expect, it } from 'vitest';
import {
  paginationContentClasses,
  paginationDisabledClasses,
  paginationEllipsisClasses,
  paginationLinkActiveClasses,
  paginationLinkBaseClasses,
  paginationLinkInactiveClasses,
  paginationLinkSizeClasses,
  paginationNavClasses,
  paginationNextClasses,
  paginationPreviousClasses,
} from '../../../src/components/pagination/pagination.classes';

describe('pagination classes', () => {
  it('the nav centres the trail within the full width', () => {
    expect(paginationNavClasses).toBe('mx-auto flex w-full justify-center');
  });

  it('the content row is an inline flex row with a token gap', () => {
    expect(paginationContentClasses).toBe('flex flex-row items-center gap-1');
  });

  it('the link base carries the sole motion intent (hover colour), a focus ring, and disabled affordances', () => {
    expect(paginationLinkBaseClasses).toContain('transition-colors');
    // Reduced motion is the token sheet's job, never the component's: the
    // generated duration-*/delay-* utilities zero themselves under
    // prefers-reduced-motion (REDUCED_MOTION_ZEROED in the tailwind
    // exporter). Its ABSENCE is the assertion -- the tripwire against
    // reintroducing a component-level escape.
    expect(paginationLinkBaseClasses).not.toContain('motion-reduce:');
    expect(paginationLinkBaseClasses).toContain('focus-visible:ring-2');
    expect(paginationLinkBaseClasses).toContain('focus-visible:ring-ring');
    expect(paginationLinkBaseClasses).toContain('disabled:pointer-events-none');
    expect(paginationLinkBaseClasses).toContain('aria-disabled:pointer-events-none');
  });

  // `pagination / link / hover` and `pagination / link / current change` both
  // assign tier `fast` and curve role `standard` to the same colour change on
  // the same part, so one transition on the link base satisfies both --
  // deduplicated by the motion, not by the moment. Neither is a keyframe.
  it('the link base consumes both colour rows as one transition', () => {
    expect(paginationLinkBaseClasses).toContain('duration-fast');
    expect(paginationLinkBaseClasses).toContain('ease-standard');
    expect(paginationLinkBaseClasses).not.toMatch(/duration-\d/);
    expect(paginationLinkBaseClasses).not.toContain('animate-');
    expect(paginationLinkActiveClasses).not.toContain('duration-');
  });

  it('the active link reads with the primary token pairing and honours aria-current', () => {
    expect(paginationLinkActiveClasses).toContain('bg-primary');
    expect(paginationLinkActiveClasses).toContain('text-primary-foreground');
    expect(paginationLinkActiveClasses).toContain('aria-[current=page]:bg-primary');
  });

  it('the inactive link is transparent with an accent hover', () => {
    expect(paginationLinkInactiveClasses).toBe(
      'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
    );
  });

  it('exposes the four size presets, defaulting the icon square', () => {
    expect(Object.keys(paginationLinkSizeClasses).sort()).toEqual(['default', 'icon', 'lg', 'sm']);
    expect(paginationLinkSizeClasses.icon).toBe('h-10 w-10');
    expect(paginationLinkSizeClasses.default).toBe('h-10 min-w-10 px-4 py-2');
  });

  it('Previous/Next add a directional gap and the disabled dimmer greys the control', () => {
    expect(paginationPreviousClasses).toBe('gap-1 pl-2.5');
    expect(paginationNextClasses).toBe('gap-1 pr-2.5');
    expect(paginationDisabledClasses).toBe('pointer-events-none opacity-50');
  });

  it('the ellipsis centres its glyph', () => {
    expect(paginationEllipsisClasses).toBe('flex h-9 w-9 items-center justify-center');
  });

  it('never emits a raw colour/spacing arbitrary value', () => {
    // Semantic tokens only. The active-link string is excluded from this guard
    // because it carries the `aria-[current=page]` variant selector -- a state
    // variant, not an arbitrary colour/length value.
    for (const cls of [
      paginationNavClasses,
      paginationContentClasses,
      paginationLinkBaseClasses,
      paginationLinkInactiveClasses,
      paginationEllipsisClasses,
      paginationPreviousClasses,
      paginationNextClasses,
      paginationDisabledClasses,
    ]) {
      expect(cls).not.toMatch(/\[[a-z0-9.#]+\]/);
    }
  });
});
