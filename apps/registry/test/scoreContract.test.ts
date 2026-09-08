import { describe, expect, it } from 'vitest';
import { listComponentNames, loadComponent } from '../src/lib/registry/componentService';

/**
 * A TARGET PUBLISHES EVERY PROP ITS OWN INTERFACE DECLARES.
 *
 * The regex path for astro/vue/svelte resolved a prop only when its type was a
 * literal union it could find, and DROPPED every other optional prop with no
 * error. `container.astro` declares twelve props in its `Props` interface and
 * the registry published three of them -- so an Astro consumer could not
 * discover `padding`, `columns`, `position`, `gap`, `colSpan`, `rowSpan`,
 * `query`, `queryName` or `fill` at all, while react showed all twelve.
 *
 * The names were never missing; only their types were unresolvable. The score
 * (`<Component>Config`) now supplies those types. It does NOT supply the
 * surface: each target's own interface decides which props that target has, so
 * sidebar keeps the provider's `open` off its facet and typography keeps `as`.
 */

type Facet = { props?: Record<string, { required?: boolean; default?: unknown }> };
type Item = { facets?: Record<string, Facet> } | null;

const facetsOf = (name: string) => (loadComponent(name) as unknown as Item)?.facets ?? {};

describe('target surfaces are fully resolved', () => {
  it('container publishes all twelve on every target that performs it', () => {
    const facets = facetsOf('container');
    const expected = [
      'as',
      'colSpan',
      'columns',
      'depth',
      'fill',
      'gap',
      'padding',
      'position',
      'query',
      'queryName',
      'rowSpan',
      'size',
    ];

    for (const target of ['react', 'astro']) {
      expect(Object.keys(facets[target]?.props ?? {}).sort(), `${target} facet`).toEqual(expected);
    }
  });

  it('keeps each target to its OWN declared surface', () => {
    // sidebar.astro declares `id` and takes `collapsible`/`defaultOpen`;
    // SidebarProps deliberately omits the provider's controlled state (#2165).
    const sidebar = facetsOf('sidebar');
    expect(Object.keys(sidebar['react']?.props ?? {}).sort()).toEqual(['side', 'variant']);
    expect(Object.keys(sidebar['astro']?.props ?? {}).sort()).toEqual([
      'collapsible',
      'defaultOpen',
      'id',
      'side',
      'variant',
    ]);

    // `as` is a react/astro authoring affordance, not part of the score.
    expect(Object.keys(facetsOf('typography')['react']?.props ?? {})).toContain('as');
  });

  it('a prop that carries a default is never also required', () => {
    const offenders: string[] = [];

    for (const name of listComponentNames()) {
      for (const [target, facet] of Object.entries(facetsOf(name))) {
        for (const [prop, field] of Object.entries(facet.props ?? {})) {
          if (field.default !== undefined && field.required === true) {
            offenders.push(`${name}.${target}.${prop}`);
          }
        }
      }
    }

    expect(offenders, offenders.join(', ')).toEqual([]);
  });

  it('reports one default per prop across every target that has it', () => {
    const disagreements: string[] = [];

    for (const name of listComponentNames()) {
      const seen = new Map<string, unknown>();
      for (const facet of Object.values(facetsOf(name))) {
        for (const [prop, field] of Object.entries(facet.props ?? {})) {
          if (field.default === undefined) continue;
          if (seen.has(prop) && seen.get(prop) !== field.default) {
            disagreements.push(`${name}.${prop}`);
          }
          seen.set(prop, field.default);
        }
      }
    }

    expect(disagreements, disagreements.join(', ')).toEqual([]);
  });
});
