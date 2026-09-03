import { describe, expect, it } from 'vitest';
import {
  itemClasses,
  itemContentClasses,
  itemDescriptionClasses,
  itemIconClasses,
  itemLabelClasses,
  itemSizeClasses,
} from '../../../src/components/item/item.classes';

function root(config: Parameters<typeof itemClasses>[0]): string {
  return itemClasses(config, {}).root;
}

describe('item classes', () => {
  it('carries the row structure and the default size', () => {
    const classes = root({});
    expect(classes).toContain('flex items-center');
    expect(classes).toContain('rounded-md');
    expect(classes).toContain(itemSizeClasses.default);
  });

  it('styles state by variant, not by config -- the projection drives it', () => {
    const classes = root({});
    // Selected and disabled visuals ride the projected aria-* attributes.
    expect(classes).toContain('aria-selected:bg-accent');
    expect(classes).toContain('aria-selected:text-accent-foreground');
    expect(classes).toContain('aria-disabled:opacity-50');
    expect(classes).toContain('aria-disabled:pointer-events-none');
    // The base (non-selected) surface and its hover affordance.
    expect(classes).toContain('text-foreground');
    expect(classes).toContain('hover:bg-accent');
  });

  it('the state classes do not depend on the config booleans', () => {
    // A static base means selected/disabled do NOT change the class string --
    // only the projected attributes change; the variants react to them.
    expect(root({ selected: true, disabled: true })).toBe(root({}));
  });

  it('resolves each size to its padding + typography role token', () => {
    expect(root({ size: 'sm' })).toContain(itemSizeClasses.sm);
    expect(root({ size: 'lg' })).toContain(itemSizeClasses.lg);
    expect(itemSizeClasses.default).toBe('px-3 py-2 text-body-small ts-body-small');
    expect(itemSizeClasses.sm).toBe('px-2 py-1.5 text-label-small ts-label-small');
    expect(itemSizeClasses.lg).toBe('px-4 py-3 text-body-medium ts-body-medium');
  });

  it('falls back to the default size for an unknown value', () => {
    // parseItemSize guards the map, so a bad size never yields an empty slot.
    expect(root({ size: 'huge' as never })).toContain(itemSizeClasses.default);
  });

  // Reduced motion is the token sheet's job, never the component's: the
  // generated duration-* and delay-* utilities zero themselves under
  // prefers-reduced-motion (REDUCED_MOTION_ZEROED in the tailwind exporter).
  // Its ABSENCE is the assertion -- the tripwire against reintroducing one.
  it('transitions colour and adds no component-level reduced-motion escape', () => {
    expect(root({})).toContain('transition-colors');
    expect(root({})).not.toContain('motion-reduce:');
  });

  // `item / root / hover`: a colour change on a part that stays put, so a
  // transition named as composed generics -- tier `fast`, curve role
  // `standard`, no literal timing.
  it('the hover colour transition consumes the tier and curve the matrix assigns', () => {
    expect(root({})).toContain('duration-fast');
    expect(root({})).toContain('ease-standard');
    expect(root({})).not.toMatch(/duration-\d/);
  });

  it('sub-part classes are config-independent literals', () => {
    expect(itemIconClasses).toBe('shrink-0 text-current');
    expect(itemContentClasses).toBe('flex min-w-0 flex-1 flex-col');
    expect(itemLabelClasses).toBe('truncate');
    expect(itemDescriptionClasses).toBe(
      'truncate text-muted-foreground text-label-small ts-label-small mt-0.5',
    );
  });

  it('never emits a raw arbitrary value', () => {
    expect(root({ size: 'lg' })).not.toMatch(/\[[a-z0-9.#]+\]/);
  });
});
