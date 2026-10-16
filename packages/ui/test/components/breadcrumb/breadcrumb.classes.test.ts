import { resolve } from 'node:path';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  mirrorPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import classy from '../../../src/primitives/classy';
import {
  breadcrumbEllipsisClasses,
  breadcrumbIconClasses,
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
    expect(breadcrumbPageClasses.split(' ')).toContain('text-foreground');
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

describe('breadcrumb icon classes', () => {
  it('the link and the page are grids whose columns follow reading order', () => {
    for (const cls of [breadcrumbLinkClasses, breadcrumbPageClasses]) {
      const tokens = cls.split(' ');
      for (const literal of ['inline-grid', 'grid-flow-col', 'items-center', 'gap-1.5']) {
        expect(tokens).toContain(literal);
      }
      expect(cls).not.toMatch(/(^|\s)(p[lr]|m[lr]|left|right|float)-/);
    }
  });

  it('padding tightens per side with logical classes', () => {
    for (const cls of [breadcrumbLinkClasses, breadcrumbPageClasses]) {
      expect(cls).toContain('has-data-[icon=inline-start]:ps-0');
      expect(cls).toContain('has-data-[icon=inline-end]:pe-0');
    }
  });

  it('the icon wrapper only places and hides, never sizes', () => {
    expect(breadcrumbIconClasses).toBe('inline-grid place-items-center');
  });

  it('classy keeps every new literal', () => {
    for (const cls of [breadcrumbLinkClasses, breadcrumbPageClasses, breadcrumbIconClasses]) {
      const kept = classy(cls).split(' ');
      for (const literal of cls.split(' ')) {
        expect(kept, `classy dropped ${literal}`).toContain(literal);
      }
    }
  });
});

const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

describe('breadcrumb icon candidates compile', () => {
  it('every icon candidate became a real rule, on logical edges', async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
      mirrorPlugin,
    ]);
    const css = await registryToCompiled(registry, {
      contentSources: [resolve(import.meta.dirname, '../../../src/components/breadcrumb')],
    });
    const candidates = [
      ...breadcrumbLinkClasses.split(' '),
      ...breadcrumbPageClasses.split(' '),
      ...breadcrumbIconClasses.split(' '),
    ].filter(
      (c) =>
        c.includes('data-[icon') ||
        c === 'inline-grid' ||
        c === 'grid-flow-col' ||
        c === 'place-items-center',
    );
    const missing = [...new Set(candidates)].filter((c) => !css.includes(escapeCandidate(c)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
    expect(css).toMatch(/padding-inline-start/);
    expect(css).toMatch(/padding-inline-end/);
  }, 120_000);
});
