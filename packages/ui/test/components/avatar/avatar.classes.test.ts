import { describe, expect, it } from 'vitest';
import {
  avatarClasses,
  avatarFallbackClasses,
  avatarImageClasses,
  avatarSizeClasses,
} from '../../../src/components/avatar/avatar.classes';

describe('avatar classes', () => {
  it('composes the base surface with the resolved size on the root', () => {
    const { root } = avatarClasses({ size: 'md' });
    expect(root).toContain('relative flex shrink-0 overflow-hidden rounded-full');
    expect(root).toContain(avatarSizeClasses.md);
  });

  it('reflects each size token on the root', () => {
    for (const size of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
      expect(avatarClasses({ size }).root).toContain(avatarSizeClasses[size]);
    }
  });

  it('defaults to md when the size is unknown', () => {
    expect(avatarClasses({ size: 'mega' as never }).root).toContain(avatarSizeClasses.md);
  });

  it('image and fallback classes are config-independent literals', () => {
    const set = avatarClasses({ size: 'lg' });
    expect(set.image).toBe(avatarImageClasses);
    expect(set.fallback).toBe(avatarFallbackClasses);
  });

  // `avatar / image / load`: fade, tier `moderate`, curve role `enter`. The
  // image is absent from the DOM until it loads, so its first paint is the
  // load moment and the cell utility rides the part unconditionally.
  it('the image consumes the load fade the matrix assigns', () => {
    expect(avatarImageClasses).toContain('animate-fade-in-moderate-enter');
    expect(avatarImageClasses).not.toMatch(/duration-\d/);
    expect(avatarImageClasses).not.toContain('motion-reduce:');
  });

  // `avatar / image -> fallback / error` assigns a crossfade to a discrete
  // state change -- nothing CSS interpolates, and the fallback also takes the
  // slot while merely loading, which the row does not cover. Reported in the
  // classes file, not faked with a fade the row never assigned.
  it('the fallback swap carries no motion, matching the unconsumable row', () => {
    expect(avatarFallbackClasses).not.toContain('animate-');
  });

  it('the fallback uses semantic colour tokens, never a raw colour', () => {
    expect(avatarFallbackClasses).toContain('bg-muted');
    expect(avatarFallbackClasses).toContain('text-muted-foreground');
  });

  it('never emits a raw arbitrary value', () => {
    expect(avatarClasses({ size: 'xl' }).root).not.toMatch(/\[[a-z0-9.#]+\]/);
  });
});
