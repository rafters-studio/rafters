import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getRegistryIndex,
  listComponentNames,
  listPrimitiveNames,
  listSubstrate,
  listSubstrateKinds,
  loadAllComponents,
  loadAllComposites,
  loadComponent,
  loadPrimitive,
  loadSubstrate,
  parseJSDocFromSource,
  propFieldToFieldDescriptor,
  type RegistryItem,
} from '../src/lib/registry/componentService';
import { isInsideDir } from '../src/lib/registry/typeChecker';
import { RegistryItemSchema } from '../../../packages/cli/src/registry/types';
import {
  assembleGraph,
  describe as describeGraph,
  type ExpandedNodeResult,
  type Graph,
  type NodeResult,
} from '../../../packages/cli/src/mcp/graph';

/** The real component root, for the sibling-prefix anchoring test. */
const UI_COMPONENTS = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/ui/src/components',
);

/**
 * Registry cutover guard (#1896). The registry serves behavior-layer sources
 * from packages/ui/src/components (NESTED: <name>/<name>.tsx), not the flat
 * src/old/ui, AND resolves their lib/hooks runtime substrate copy-in like
 * primitives. The dangerous failure modes are SILENT:
 *   - a bare path swap returns an empty registry with no error;
 *   - a served component references lib/hooks the registry never serves, so
 *     `rafters add` writes a component with dangling @/lib and @/hooks imports.
 * These tests fail loudly on either.
 */
describe('registry serves behavior-layer components from src/components', () => {
  const names = listComponentNames();

  it('serves a non-empty, sorted, deduplicated component list', () => {
    expect(names.length).toBeGreaterThanOrEqual(34);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual(names);
  });

  it('contains known behavior-layer components', () => {
    expect(names).toContain('button');
    expect(names).toContain('accordion');
    expect(names).toContain('dialog');
  });

  it('bundles the behavior score and shared classes with a served component', () => {
    const button = loadComponent('button');
    if (!button) throw new Error('button did not load');
    const paths = button.files.map((f) => f.path);
    expect(paths).toContain('components/ui/button.behavior.ts');
    expect(paths).toContain('components/ui/button.classes.ts');
  });

  it('resolves every nested framework variant', () => {
    const button = loadComponent('button');
    if (!button) throw new Error('button did not load');
    const paths = button.files.map((f) => f.path);
    expect(paths).toContain('components/ui/button.tsx');
    expect(paths).toContain('components/ui/button.astro');
    expect(paths).toContain('components/ui/button.element.ts');
  });

  it('a served component carries container-query classes (the scanner has something to find)', () => {
    const containerQuery = /@(?:xs|sm|md|lg|xl|2xl|container)/;
    const hasCq = names.some((name) => {
      const item = loadComponent(name);
      return item?.files.some((f) => containerQuery.test(f.content)) ?? false;
    });
    expect(hasCq).toBe(true);
  });

  it('returns null for an unknown component name', () => {
    expect(loadComponent('does-not-exist')).toBeNull();
  });
});

/**
 * Sub-components are FIRST-CLASS REGISTRY NAMES (#2019). A shadcn consumer
 * writes `import CardHeader from '@/components/ui/card-header.astro'`, so
 * `rafters add card-header` has to serve it -- it used to 404, because
 * resolution assumed `<components>/<name>/<name>.ext` and there is no
 * `card-header/` directory. Sub-components live BESIDE the parent whose
 * `.classes.ts` they import, so the directory is now resolved by trimming
 * trailing `-segment`s off the name, with a directory of the component's own
 * always winning.
 */
describe('registry serves sub-components addressably', () => {
  it('lists card sub-components as names of their own', () => {
    const names = listComponentNames();
    for (const sub of ['card-header', 'card-title', 'card-action', 'card-content', 'card-footer']) {
      expect(names, sub).toContain(sub);
    }
    // The parent is still its own item.
    expect(names).toContain('card');
  });

  it('serves card-header with its file AND the parent shared file it imports', () => {
    const item = loadComponent('card-header');
    if (!item) throw new Error('card-header did not load');
    const paths = item.files.map((f) => f.path);
    expect(paths).toContain('components/ui/card-header.astro');
    // Without card.classes.ts at that exact install path, the sub-component's
    // `./card.classes` import dangles on install -- the silent failure.
    expect(paths).toContain('components/ui/card.classes.ts');
  });

  it('every card sub-component bundles the shared classes it imports', () => {
    for (const sub of ['card-title', 'card-action', 'card-content', 'card-footer']) {
      const item = loadComponent(sub);
      if (!item) throw new Error(`${sub} did not load`);
      const paths = item.files.map((f) => f.path);
      expect(paths, sub).toContain(`components/ui/${sub}.astro`);
      expect(paths, sub).toContain('components/ui/card.classes.ts');
    }
  });

  it('a directory of its own always WINS over parent-prefix resolution', () => {
    // alert-dialog and hover-card merely share a prefix with alert/hover; they
    // are full components and must keep resolving to themselves.
    const alertDialog = loadComponent('alert-dialog');
    if (!alertDialog) throw new Error('alert-dialog did not load');
    expect(alertDialog.files.map((f) => f.path)).toContain('components/ui/alert-dialog.tsx');

    const hoverCard = loadComponent('hover-card');
    if (!hoverCard) throw new Error('hover-card did not load');
    expect(hoverCard.files.map((f) => f.path)).toContain('components/ui/hover-card.tsx');
  });

  it('the parent still ships whole -- card bundles its sub-components', () => {
    const card = loadComponent('card');
    if (!card) throw new Error('card did not load');
    const paths = card.files.map((f) => f.path);
    expect(paths).toContain('components/ui/card.tsx');
    expect(paths).toContain('components/ui/card.astro');
    expect(paths).toContain('components/ui/card-header.astro');
  });

  it('still returns null for a sub-component name with no file behind it', () => {
    // The mechanism makes a sub-component addressable the moment its file
    // lands; it does not invent one. typography-h1 has no file in this tree.
    expect(loadComponent('card-nonexistent')).toBeNull();
    expect(loadComponent('typography-h1')).toBeNull();
  });
});

describe('registry resolves the behavior-layer runtime substrate', () => {
  it('discovers substrate kinds from the filesystem (lib, hooks, ...)', () => {
    const kinds = listSubstrateKinds();
    expect(kinds).toContain('lib');
    expect(kinds).toContain('hooks');
    // Dedicated-loader / deprecated dirs are NOT substrate.
    expect(kinds).not.toContain('components');
    expect(kinds).not.toContain('primitives');
    expect(kinds).not.toContain('old');
    expect(kinds).not.toContain('composites');
  });

  it('lists substrate names flat, excluding tests and barrel indexes', () => {
    const names = listSubstrate();
    expect(names).toContain('contract');
    expect(names).toContain('compose');
    expect(names).toContain('use-memory');
    expect(names).not.toContain('index');
    expect(names.every((n) => !n.endsWith('.test'))).toBe(true);
  });

  it('exposes the flat substrate list in the registry index', () => {
    const index = getRegistryIndex();
    expect(index.substrate).toContain('contract');
    expect(index.substrate).toContain('use-memory');
  });

  it('serves a lib file as a substrate item, kind carried in the path', () => {
    const contract = loadSubstrate('contract');
    if (!contract) throw new Error('contract did not load');
    expect(contract.type).toBe('substrate');
    expect(contract.files.map((f) => f.path)).toEqual(['lib/contract.ts']);
    // contract imports ../primitives/memory (value) -> resolvable primitive dep
    expect(contract.primitives).toContain('memory');
  });

  it('serves a hook file as a substrate item with react and its deps', () => {
    const useMemory = loadSubstrate('use-memory');
    if (!useMemory) throw new Error('use-memory did not load');
    expect(useMemory.type).toBe('substrate');
    expect(useMemory.files.map((f) => f.path)).toEqual(['hooks/use-memory.ts']);
    expect(useMemory.files[0].dependencies).toContain('react@19.2.0');
    expect(useMemory.primitives).toContain('memory');
  });

  it('captures TYPE-ONLY substrate imports (compose depends on contract)', () => {
    // compose imports `type ... from './contract'` -- type-only, but the file
    // must still install for tsc, so it must appear as a dependency.
    const compose = loadSubstrate('compose');
    if (!compose) throw new Error('compose did not load');
    expect(compose.primitives).toContain('contract');
  });

  it('a behavior component declares its substrate as dependencies', () => {
    const button = loadComponent('button');
    if (!button) throw new Error('button did not load');
    // button.tsx imports ../../lib/contract and ../../hooks/use-memory
    expect(button.primitives).toContain('contract');
    expect(button.primitives).toContain('use-memory');
  });

  it('returns null for an unknown substrate name', () => {
    expect(loadSubstrate('does-not-exist')).toBeNull();
  });

  it('component, primitive, and substrate name sets are pairwise DISJOINT', () => {
    // fetchItem resolves a dep name by trying endpoints in order, and substrate
    // is a flat namespace across all kinds. If a name lived in two categories
    // (or two kinds), `rafters add` would fetch the wrong item. Uniform-name
    // resolution depends on these sets never overlapping.
    const sets = {
      components: listComponentNames(),
      primitives: listPrimitiveNames(),
      substrate: listSubstrate(),
    };
    const keys = Object.keys(sets) as (keyof typeof sets)[];
    const collisions: string[] = [];
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        const other = new Set(sets[keys[b]]);
        for (const name of sets[keys[a]]) {
          if (other.has(name)) collisions.push(`${name}: ${keys[a]} & ${keys[b]}`);
        }
      }
    }
    expect(collisions).toEqual([]);
    // Flat substrate also requires unique names ACROSS kinds.
    expect(new Set(listSubstrate()).size).toBe(listSubstrate().length);
  });
});

describe('every served component resolves a COMPLETE dependency closure', () => {
  // Mirror the CLI's fetchItem resolution order (ui first, then primitive, then
  // lib/hooks -- composite/rule are not referenced in a component closure). The
  // disjointness test above guarantees at most one loader matches each name, so
  // order only affects which null-returns are tried, not the result. If any
  // dependency name fails to resolve, `rafters add` would install a component
  // with a dangling import -- exactly the gap this cutover closes.
  function resolveItem(name: string): RegistryItem | null {
    return loadComponent(name) ?? loadPrimitive(name) ?? loadSubstrate(name);
  }

  function closureUnresolved(root: string): string[] {
    const seen = new Set<string>();
    const unresolved: string[] = [];
    const walk = (name: string): void => {
      if (seen.has(name)) return;
      seen.add(name);
      const item = resolveItem(name);
      if (!item) {
        unresolved.push(name);
        return;
      }
      for (const dep of item.primitives) walk(dep);
    };
    walk(root);
    return unresolved;
  }

  it('button pulls contract, use-memory, and memory with nothing dangling', () => {
    const seen = new Set<string>();
    const walk = (name: string): void => {
      if (seen.has(name)) return;
      seen.add(name);
      const item = resolveItem(name);
      if (!item) return;
      for (const dep of item.primitives) walk(dep);
    };
    walk('button');
    expect(seen).toContain('contract');
    expect(seen).toContain('use-memory');
    expect(seen).toContain('memory');
    expect(closureUnresolved('button')).toEqual([]);
  });

  it('NO served component has a dangling dependency', () => {
    const offenders: Record<string, string[]> = {};
    for (const name of listComponentNames()) {
      const missing = closureUnresolved(name);
      if (missing.length > 0) offenders[name] = missing;
    }
    expect(offenders).toEqual({});
  });
});

/**
 * Per-target facet + reverse-composites extraction (#2073). loadComponent now
 * emits a `facets` field (verbatim literal-union props, per target) and a
 * populated `composites` reverse index. The composites scan is pointed at the
 * test fixtures dir via RAFTERS_COMPOSITES_DIR so the fixture composite
 * (uses-button, whose block type is `button`) is discoverable as a real
 * composite node -- keeping #2072's assembleGraph invariant satisfiable.
 */
describe('per-target facet + reverse-composites extraction (#2073)', () => {
  const fixturesDir = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures');
  let prevCompositesDir: string | undefined;
  let buttonItem: RegistryItem | null;

  beforeAll(() => {
    prevCompositesDir = process.env['RAFTERS_COMPOSITES_DIR'];
    process.env['RAFTERS_COMPOSITES_DIR'] = fixturesDir;
    buttonItem = loadComponent('button');
  });

  afterAll(() => {
    if (prevCompositesDir === undefined) delete process.env['RAFTERS_COMPOSITES_DIR'];
    else process.env['RAFTERS_COMPOSITES_DIR'] = prevCompositesDir;
  });

  it("extracts react's variant as a verbatim literal union with its destructured default", () => {
    // Exact, ordered equality on purpose: #2165 pins the emitted order to the
    // SOURCE order of the union declaration, never the checker's own union
    // member order (which is keyed on global literal-type interning and would
    // reshuffle when an unrelated component is added to the shared program).
    expect(buttonItem?.facets?.react?.props['variant']).toEqual({
      type: 'enum',
      values: [
        'default',
        'primary',
        'secondary',
        'destructive',
        'success',
        'warning',
        'info',
        'muted',
        'accent',
        'outline',
        'ghost',
        'link',
      ],
      // button.tsx:90 destructures `variant = 'default'` -- extractable, not left undefined.
      default: 'default',
    });
  });

  it('never collapses a styling prop to a bare string type', () => {
    expect(buttonItem?.facets?.react?.props['variant']?.type).not.toBe('string');
  });

  it('preserves the astro/react required/optional asymmetry for `id`', () => {
    // astro's `id: string` is required; react has no `id` prop of its own.
    expect(buttonItem?.facets?.astro?.props['id']).toMatchObject({ required: true });
    expect(buttonItem?.facets?.react?.props['id']).toBeUndefined();
  });

  it('sources react `size` (which lives in the ButtonProps intersection, not the interface body)', () => {
    // `size` is declared in the two arms of the ButtonProps intersection, never
    // in the ButtonBaseProps body, so an interface-body scan misses it. Exact
    // and ordered like `variant` above: the four NonIconSize members come first
    // because that arm is declared first, then IconSize's four (#2165 pins the
    // emit order to the declarations, not to the checker's union order).
    expect(buttonItem?.facets?.react?.props['size']).toEqual({
      type: 'enum',
      values: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
      default: 'default',
    });
  });

  it('emits an honest empty wc facet -- no functional attribute-driven props today', () => {
    expect(buttonItem?.facets?.wc?.props).toEqual({});
    // Never a fabricated `<rafters-button variant="primary">` attribute surface.
    expect(buttonItem?.facets?.wc?.snippet).not.toContain('variant="primary"');
  });

  it('populates the reverse composites index against a fixture that references button', () => {
    expect(buttonItem?.composites).toContain('uses-button');
  });

  it('parses cleanly against the CLI RegistryItemSchema (the hand-synced shapes agree)', () => {
    expect(() => RegistryItemSchema.parse(buttonItem)).not.toThrow();
  });
});

/**
 * The `@constraint` JSDoc tag (#2073). button.tsx carries no `@constraint` tag
 * today, and packages/ui/src/components/** is out of this issue's blast surface
 * (read-only), so the FACET-level assertion
 * `facets.react.props.size.constraint` cannot be satisfied without a source edit
 * -- reported to the team lead, not forced. These tests exercise the parser case
 * added to parseJSDocFromSource directly, against inline source; the facet wiring
 * (extractConstraints -> makeEnum) lights up the moment a component gains the tag.
 */
describe('@constraint JSDoc tag parsing (#2073)', () => {
  const wellFormed =
    '/**\n * @cognitive-load 3\n * @constraint when prop=size matches=icon* requires prop=aria-label\n */';
  const malformed = '/**\n * @cognitive-load 3\n * @constraint when prop=size\n */';

  it('accepts a well-formed @constraint body under strict intel', () => {
    expect(() =>
      parseJSDocFromSource(wellFormed, { strict: true, componentName: 'button' }),
    ).not.toThrow();
  });

  it('throws under strict intel on a malformed @constraint body, naming the component', () => {
    expect(() =>
      parseJSDocFromSource(malformed, { strict: true, componentName: 'button' }),
    ).toThrow(/Malformed @constraint in button/);
  });

  it('ignores a malformed @constraint body when not in strict mode', () => {
    // Non-strict: the tag is not an intelligence field, so it neither throws nor
    // contributes -- the component still yields its other intelligence.
    const intel = parseJSDocFromSource(malformed, { componentName: 'button' });
    expect(intel?.cognitiveLoad).toBe(3);
  });
});

/**
 * Type-checker-based prop extraction (#2165). The regex extractor missed badge
 * (as-const array alias), container (resolveUnion called with no type annotation),
 * grid (body-level destructuring), input (scalar props), card, and sidebar. The
 * TS checker resolves all of them through alias depth, intersections, and
 * (typeof X)[number] patterns.
 */
describe('type-checker-based prop extraction (#2165)', () => {
  it('extracts badge variant from an as-const array alias, in BADGE_VARIANTS order', () => {
    const badge = loadComponent('badge');
    // Verbatim, ordered: the values and their order both come from the
    // `BADGE_VARIANTS` as-const array `(typeof BADGE_VARIANTS)[number]` names.
    expect(badge?.facets?.react?.props['variant']).toEqual({
      type: 'enum',
      values: [
        'default',
        'primary',
        'secondary',
        'destructive',
        'success',
        'warning',
        'info',
        'muted',
        'accent',
        'outline',
        'ghost',
        'link',
      ],
      default: 'default',
    });
  });

  it('extracts badge size from an as-const array alias', () => {
    const badge = loadComponent('badge');
    expect(badge?.facets?.react?.props['size']).toEqual({
      type: 'enum',
      values: ['sm', 'default', 'lg'],
      default: 'default',
    });
  });

  it('extracts container as/size without a naming-convention alias', () => {
    const container = loadComponent('container');
    // `{ as: Element = 'div' }` (container.tsx:333): the default is keyed on
    // the PROP name, not the renamed local, so it reaches the facet.
    expect(container?.facets?.react?.props['as']).toEqual({
      type: 'enum',
      values: ['div', 'main', 'header', 'footer', 'section', 'article', 'aside'],
      default: 'div',
    });
    expect(container?.facets?.react?.props['size']).toEqual({
      type: 'enum',
      values: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full'],
    });
  });

  /**
   * The three props the issue's Proof section named as the gap the checker
   * must close. All three are MIXED unions -- literal members beside a
   * structural or boolean arm -- which every pure classifier declines, so
   * before the mixed-union arm existed they fell out of the loop silently.
   */
  it('emits container columns/gap and grid columns from mixed literal unions', () => {
    const container = loadComponent('container');
    const grid = loadComponent('grid');
    const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'auto'];

    // ResponsiveColumns = ColumnsValue | ResponsiveColumnsObject. The object
    // arm has no enum representation and is dropped; the literals are the
    // vocabulary an agent can pick from.
    expect(container?.facets?.react?.props['columns']).toEqual({ type: 'enum', values: columns });
    expect(grid?.facets?.react?.props['columns']).toEqual({ type: 'enum', values: columns });

    // gap = boolean | ContainerPadding: `true` derives the gap from `size`, so
    // the boolean literals are real members of the vocabulary, not noise.
    expect(container?.facets?.react?.props['gap']).toEqual({
      type: 'enum',
      values: [
        'true',
        'false',
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '8',
        '10',
        '12',
        '16',
        '20',
        '24',
      ],
    });
  });

  it('numbers a numeric-literal union in numeric order, never lexical', () => {
    const container = loadComponent('container');
    expect(container?.facets?.react?.props['colSpan']).toEqual({
      type: 'enum',
      values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    });
  });

  it('declines to enumerate a union whose non-literal arm is a widened primitive', () => {
    // select's `children` is React.ReactNode -- ReactElement | string | number
    // | boolean | ... . Its `true`/`false` members are literals, but publishing
    // them as a two-value enum would be a lie about the prop's domain.
    const select = loadComponent('select');
    expect(select?.facets?.react?.props['children']).toBeUndefined();
  });

  it('extracts container boolean and string props', () => {
    const container = loadComponent('container');
    expect(container?.facets?.react?.props['query']).toMatchObject({
      type: 'boolean',
      default: true,
    });
    expect(container?.facets?.react?.props['queryName']).toMatchObject({
      type: 'string',
    });
    expect(container?.facets?.react?.props['fill']).toMatchObject({
      type: 'string',
    });
  });

  it('extracts grid preset regardless of destructuring shape', () => {
    const grid = loadComponent('grid');
    expect(grid?.facets?.react?.props['preset']).toEqual({
      type: 'enum',
      values: ['linear', 'golden', 'bento'],
      default: 'linear',
    });
  });

  it('emits scalar props for input instead of props: {}', () => {
    const input = loadComponent('input');
    expect(input?.facets?.react?.props['value']).toMatchObject({ type: 'string' });
    expect(input?.facets?.react?.props['defaultValue']).toMatchObject({ type: 'string' });
    expect(input?.facets?.react?.props['invalid']).toMatchObject({ type: 'boolean' });
    expect(input?.facets?.react?.props['errorId']).toMatchObject({ type: 'string' });
  });

  it('emits card own declared props', () => {
    const card = loadComponent('card');
    const asField = card?.facets?.react?.props['as'];
    expect(asField?.type).toBe('enum');
    if (asField?.type !== 'enum') throw new Error('as not enum');
    expect(asField.values).toEqual(expect.arrayContaining(['article', 'div', 'section', 'aside']));
    // card.tsx:97 destructures `as: Element = 'div'` -- the renamed binding.
    expect(asField.default).toBe('div');
    expect(card?.facets?.react?.props['fill']).toMatchObject({ type: 'string' });
  });

  /**
   * The four exact-key-set tests below pin WHICH props type the checker picked,
   * which no other test in this file can (#2196 review).
   *
   * Four component files declare a provider or a sub-component interface ABOVE
   * the component's own, so a search that takes the first `*Props` declaration
   * publishes the wrong prop surface -- and a wrong props type is
   * self-consistent everywhere downstream: the wide graph test compares the
   * registry against the same registry items that built the graph, so it proves
   * transport, not extraction. A partial `arrayContaining` cannot separate them
   * either -- `SidebarProps` and `SidebarProviderProps` SHARE side and variant,
   * so sampling those two keys passes under either resolution.
   *
   * Only the exact key set discriminates. Each one is the component's own
   * declared members plus whatever its extends chain contributes from inside
   * the component directory (typography's token props), never a neighbour's.
   */
  it('emits sidebar own declared props, not the provider it sits under', () => {
    const props = loadComponent('sidebar')?.facets?.react?.props ?? {};
    // SidebarProps (sidebar.tsx:210) declares exactly side and variant.
    // SidebarProviderProps (:109) is declared first and adds open, defaultOpen
    // and collapsible -- knobs `<Sidebar>` itself does not accept.
    expect(Object.keys(props).sort()).toEqual(['side', 'variant']);
    // No default: `Sidebar({ side, variant, ... })` destructures without
    // initializers. The 'left'/'sidebar' defaults belong to SidebarProvider's
    // parameter, and defaults are read off the props type's own component
    // (#2165 Behavior), not synthesized from a neighbour's.
    expect(props['side']).toEqual({ type: 'enum', values: ['left', 'right'] });
    expect(props['variant']).toEqual({
      type: 'enum',
      values: ['sidebar', 'floating', 'inset'],
    });
  });

  it('emits tooltip root props, not the provider that wraps it', () => {
    const props = loadComponent('tooltip')?.facets?.react?.props ?? {};
    // TooltipProps (tooltip.tsx:107). TooltipProviderProps (:66) is declared
    // first and carries only disableHoverableContent -- the provider's knob.
    expect(Object.keys(props).sort()).toEqual([
      'align',
      'defaultOpen',
      'open',
      'side',
      'sideOffset',
    ]);
    expect(props['disableHoverableContent']).toBeUndefined();
    expect(props['sideOffset']).toEqual({ type: 'number' });
  });

  it('emits typography as/variant, not the token interface it extends', () => {
    const props = loadComponent('typography')?.facets?.react?.props ?? {};
    // TypographyProps (typography.tsx:139) adds `as` and `variant` on top of
    // TypographyComponentProps (:67, declared first), whose token props reach
    // the facet through the extends chain because they are declared inside the
    // component's own directory. Resolving to :67 drops `as` and `variant`.
    expect(Object.keys(props).sort()).toEqual([
      'align',
      'as',
      'family',
      'line',
      'size',
      'tracking',
      'transform',
      'variant',
      'weight',
    ]);
    expect(props['as']).toMatchObject({ type: 'enum', default: 'p' });
  });

  it('emits an empty prop set when the component declares no props type', () => {
    // resizable.tsx declares ResizablePanelProps, ResizableHandleProps and
    // ResizablePanelGroupProps -- no `ResizableProps`. #2165's Error Handling
    // clause makes that the documented empty-props case, and the alternative is
    // concrete harm: the first declaration is ResizablePanelProps, which would
    // publish the group-injected internal `__resizableIndex` as a prop an agent
    // is invited to set.
    const props = loadComponent('resizable')?.facets?.react?.props ?? {};
    expect(props).toEqual({});
  });

  it('emits button boolean props the regex extractor missed', () => {
    const button = loadComponent('button');
    expect(button?.facets?.react?.props['loading']).toMatchObject({
      type: 'boolean',
      default: false,
    });
    expect(button?.facets?.react?.props['toggle']).toMatchObject({
      type: 'boolean',
      default: false,
    });
    expect(button?.facets?.react?.props['softDisabled']).toMatchObject({
      type: 'boolean',
      default: false,
    });
  });

  it('emits button string props the regex extractor missed', () => {
    const button = loadComponent('button');
    expect(button?.facets?.react?.props['loadingAnnouncement']).toMatchObject({
      type: 'string',
    });
    expect(button?.facets?.react?.props['loadedAnnouncement']).toMatchObject({
      type: 'string',
    });
  });

  it('does not emit inherited React HTML attributes', () => {
    const button = loadComponent('button');
    expect(button?.facets?.react?.props['onClick']).toBeUndefined();
    expect(button?.facets?.react?.props['className']).toBeUndefined();
    expect(button?.facets?.react?.props['style']).toBeUndefined();
  });

  it('does not emit a prop declared only in a sibling-prefixed neighbour', () => {
    // `packages/ui/src/components` really does hold button/ beside
    // button-group/, input/ beside input-group/ and input-otp/, toggle/ beside
    // toggle-group/, alert/ beside alert-dialog/. An unanchored path prefix
    // test counts every one of those as the shorter name's own directory.
    const button = loadComponent('button');
    const buttonGroup = loadComponent('button-group');
    expect(buttonGroup?.facets?.react?.props['orientation']).toBeDefined();
    expect(button?.facets?.react?.props['orientation']).toBeUndefined();
  });

  it('anchors the own-declaration test at a path segment boundary', () => {
    // The predicate itself, because no component's props type references a
    // sibling-prefixed neighbour's symbols today: the facet assertion above
    // would pass under the unanchored prefix test too.
    const buttonDir = join(UI_COMPONENTS, 'button');
    expect(isInsideDir(buttonDir, join(buttonDir, 'button.tsx'))).toBe(true);
    expect(isInsideDir(buttonDir, join(UI_COMPONENTS, 'button-group', 'button-group.tsx'))).toBe(
      false,
    );
    expect(isInsideDir(buttonDir, buttonDir)).toBe(false);
  });

  it('emits a number prop for a scalar numeric member', () => {
    const slider = loadComponent('slider');
    expect(slider?.facets?.react?.props['min']).toEqual({ type: 'number', default: 0 });
    expect(slider?.facets?.react?.props['max']).toEqual({ type: 'number', default: 100 });
    expect(slider?.facets?.react?.props['step']).toEqual({ type: 'number', default: 1 });
  });

  it('parses cleanly against the CLI RegistryItemSchema with new prop kinds', () => {
    for (const name of ['badge', 'container', 'grid', 'input', 'card', 'sidebar']) {
      const item = loadComponent(name);
      expect(() => RegistryItemSchema.parse(item), name).not.toThrow();
    }
  });
});

/**
 * Editor-subsystem relocation (#2136). The 22 `subsystem:"editor"` primitives
 * live under `packages/ui/src/primitives/editor/` on disk, but discovery must
 * find them by bare name and serve them at the UNCHANGED flat consumer path
 * (`lib/primitives/<name>.ts`). Source nesting and served layout are decoupled:
 * a consumer sees zero path churn. These tests fail loudly if discovery drops
 * the subdir (the #2018 silent-empty shape) or if the folder and the matrix tag
 * drift apart.
 *
 * `history`, `document-editor`, and `block-handler` retired from this list in
 * #2240 (the snapshot-history track); see 'retired snapshot-history
 * primitives are not registry items' below.
 */
describe('editor primitive discovery after relocation (#2136)', () => {
  const EDITOR_PRIMITIVES = [
    'block-canvas',
    'block-context-menu',
    'block-operations',
    'block-palette',
    'block-wrapper',
    'canvas-drop-zone',
    'clipboard',
    'command-palette',
    'cursor-tracker',
    'drag-drop',
    'editor-toolbar',
    'inline-formatter',
    'inline-toolbar',
    'input-events',
    'rule-dialog',
    'rule-drop-zone',
    'rule-palette',
    'selection',
    'serializer',
    'serializer-html',
    'serializer-mdx',
    'serializer-text',
  ];

  // Resolve source paths from THIS test file, never from process.cwd():
  // apps/registry/test/ -> repo root is three levels up.
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
  const primitivesDir = join(repoRoot, 'packages/ui/src/primitives');
  const editorDir = join(primitivesDir, 'editor');
  const matrixPath = join(repoRoot, 'packages/ui/docs/spec/matrix/primitives.jsonl');

  const matrixEditorNames = new Set(
    readFileSync(matrixPath, 'utf-8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as { name: string; subsystem: string })
      .filter((d) => d.subsystem === 'editor')
      .map((d) => d.name),
  );

  it('lists every editor primitive by bare name', () => {
    const names = listPrimitiveNames();
    for (const name of EDITOR_PRIMITIVES) {
      expect(names).toContain(name);
    }
  });

  it('loads each editor primitive with the served path unchanged (flat)', () => {
    for (const name of EDITOR_PRIMITIVES) {
      const item = loadPrimitive(name);
      expect(item, `loadPrimitive('${name}') returned null`).not.toBeNull();
      expect(item?.files[0]?.path).toBe(`lib/primitives/${name}.ts`);
    }
  });

  it('served editor content never leaks the editor/ source nesting', () => {
    // A nested `../types` or `../keyboard-handler` that survived into served
    // content would resolve to `lib/types` in the flat consumer tree -- a
    // dangling import. It must be flattened back to `./types` (a flat sibling)
    // before serving. (Exemplar was `block-handler` before its #2240 removal;
    // `block-canvas` exercises the identical parent-relative-import shape.)
    const canvas = loadPrimitive('block-canvas');
    const content = canvas?.files[0]?.content ?? '';
    expect(content).not.toMatch(/from\s+['"]\.\.\/(memory|types|keyboard-handler)['"]/);
    expect(content).toMatch(/from\s+['"]\.\/(types|keyboard-handler)['"]/);
    // The transitive closure still names the flat behavior siblings.
    expect(canvas?.primitives).toContain('keyboard-handler');
    expect(canvas?.primitives).toContain('types');
  });

  /**
   * #2240 retires the snapshot-history track: `history`, `document-editor`,
   * and `block-handler` are deleted from `primitives/editor/` and must stop
   * being registry items. `document-editor` is the #2220 case -- it used to
   * serve with a dangling import; now it does not serve at all.
   */
  it('retired snapshot-history primitives are not registry items', () => {
    const names = listPrimitiveNames();
    for (const retired of ['history', 'document-editor', 'block-handler']) {
      expect(names).not.toContain(retired);
      expect(loadPrimitive(retired)).toBeNull();
    }
  });

  it('non-editor primitives are unaffected at the flat root', () => {
    expect(loadPrimitive('aria-manager')?.files[0]?.path).toBe('lib/primitives/aria-manager.ts');
    expect(loadPrimitive('memory')?.files[0]?.path).toBe('lib/primitives/memory.ts');
  });

  it('editor folder membership matches matrix subsystem:"editor" exactly', () => {
    const onDisk = new Set(
      readdirSync(editorDir)
        .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
        .map((f) => f.replace(/\.tsx?$/, '')),
    );
    expect(onDisk).toEqual(matrixEditorNames);
  });

  it('no flat-root primitive carries subsystem:"editor" (drift is a failure)', () => {
    const flatNames = readdirSync(primitivesDir, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
      .map((e) => e.name.replace(/\.tsx?$/, ''));
    const misplaced = flatNames.filter((n) => matrixEditorNames.has(n));
    expect(
      misplaced,
      `editor-tagged primitives still at flat root: ${misplaced.join(', ')}`,
    ).toEqual([]);
  });
});

/**
 * Subsystem file discovery (#2170). A folder-shaped component (editor) carries
 * files beyond the primary and shared suffixes: editor-history.ts and ops/*.ts.
 * loadComponent must serve them under components/ui/<name>/, and they must NOT
 * leak into the primitives array.
 */
describe('subsystem file discovery for folder-shaped components (#2170)', () => {
  it('loadComponent("editor").files includes editor-history.ts and ops/', () => {
    const editor = loadComponent('editor');
    expect(editor).not.toBeNull();
    const paths = editor!.files.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'components/ui/editor.tsx',
        'components/ui/editor.behavior.ts',
        'components/ui/editor.classes.ts',
        'components/ui/editor/editor-history.ts',
        'components/ui/editor/ops/index.ts',
        'components/ui/editor/ops/content.ts',
        'components/ui/editor/ops/format.ts',
        'components/ui/editor/ops/structural.ts',
        'components/ui/editor/ops/text.ts',
        'components/ui/editor/ops/types.ts',
      ]),
    );
  });

  it('loadComponent("editor").primitives contains neither "ops" nor "editor-history"', () => {
    const editor = loadComponent('editor');
    expect(editor).not.toBeNull();
    expect(editor!.primitives).not.toContain('ops');
    expect(editor!.primitives).not.toContain('editor-history');
    expect(editor!.primitives).not.toContain('content');
    expect(editor!.primitives).not.toContain('format');
    expect(editor!.primitives).not.toContain('structural');
    expect(editor!.primitives).not.toContain('text');
    expect(editor!.primitives).not.toContain('types');
  });

  it('loadComponent for card, typography, and container yield unchanged file paths', () => {
    for (const name of ['card', 'typography', 'container']) {
      const item = loadComponent(name);
      expect(item).not.toBeNull();
      const paths = item!.files.map((f) => f.path);
      // All paths are flat: components/ui/<name>.<ext> or components/ui/<name>-<sub>.<ext>
      for (const p of paths) {
        const afterPrefix = p.slice('components/ui/'.length);
        expect(afterPrefix.includes('/'), `${name} has nested path: ${p}`).toBe(false);
      }
    }
  });

  it('subsystem file content is readable and non-empty', () => {
    const editor = loadComponent('editor');
    expect(editor).not.toBeNull();
    const subsystem = editor!.files.filter((f) => f.path.startsWith('components/ui/editor/'));
    expect(subsystem.length).toBeGreaterThanOrEqual(7);
    for (const file of subsystem) {
      expect(file.content.length, `${file.path} is empty`).toBeGreaterThan(0);
    }
  });

  it('parses cleanly against the CLI RegistryItemSchema', () => {
    const editor = loadComponent('editor');
    expect(editor).not.toBeNull();
    const result = RegistryItemSchema.safeParse(editor);
    expect(result.success, `schema parse failed: ${JSON.stringify(result)}`).toBe(true);
  });
});

/**
 * `propFieldToFieldDescriptor` (#2165). The operator's ruling is that the
 * shared thing across rafters/veneer/gitpress is the OUTPUT IR -- kelex's
 * `FieldDescriptor` -- not the extractor, so a resolved `PropField` has to map
 * out cleanly for veneer and gitpress to consume rafters' published facet JSON
 * instead of re-parsing rafters source.
 *
 * The issue's test sketch asserts `descriptor.default` / `.required` /
 * `.constraint`. Those are the PropField's own member names; kelex's
 * FieldDescriptor (`src/introspection/types.ts:140`) has no such members, so
 * these assert the real ones the conversion targets: `defaultValue`,
 * `isOptional` (inverted), and `meta.constraint`.
 */
describe('propFieldToFieldDescriptor (#2165)', () => {
  it('converts an enum PropField, carrying values, default and requiredness', () => {
    const descriptor = propFieldToFieldDescriptor('size', {
      type: 'enum',
      values: ['sm', 'lg'],
      default: 'sm',
      required: true,
    });
    expect(descriptor).toEqual({
      name: 'size',
      label: 'size',
      type: 'enum',
      isOptional: false,
      isNullable: false,
      constraints: {},
      metadata: { kind: 'enum', values: ['sm', 'lg'] },
      defaultValue: 'sm',
    });
  });

  it('converts a boolean PropField, keeping a `false` default rather than dropping it', () => {
    const descriptor = propFieldToFieldDescriptor('loading', { type: 'boolean', default: false });
    expect(descriptor.type).toBe('boolean');
    expect(descriptor.metadata).toEqual({ kind: 'boolean' });
    expect(descriptor.defaultValue).toBe(false);
    expect(descriptor.isOptional).toBe(true);
  });

  it('converts a string PropField and marks a required prop not-optional', () => {
    const descriptor = propFieldToFieldDescriptor('alt', { type: 'string', required: true });
    expect(descriptor.type).toBe('string');
    expect(descriptor.metadata).toEqual({ kind: 'string' });
    expect(descriptor.isOptional).toBe(false);
    expect(descriptor).not.toHaveProperty('defaultValue');
  });

  it('converts a number PropField, keeping a numeric default as a number', () => {
    const descriptor = propFieldToFieldDescriptor('step', { type: 'number', default: 4 });
    expect(descriptor.type).toBe('number');
    expect(descriptor.metadata).toEqual({ kind: 'number' });
    expect(descriptor.defaultValue).toBe(4);
  });

  it('carries a cross-prop constraint through the conversion', () => {
    // kelex's `FieldConstraints` is VALUE validation (minLength, pattern, min,
    // max) and has no arm for a cross-prop rule, so it rides in `meta` rather
    // than being silently dropped.
    const constraint = {
      when: { prop: 'size', matches: 'icon*' },
      requires: { prop: 'aria-label' },
    };
    const descriptor = propFieldToFieldDescriptor('size', {
      type: 'enum',
      values: ['icon', 'default'],
      constraint,
    });
    expect(descriptor.constraints).toEqual({});
    expect(descriptor.meta).toEqual({ constraint });
  });

  it('maps a real resolved facet prop without loss', () => {
    const variant = loadComponent('badge')?.facets?.react?.props['variant'];
    if (variant?.type !== 'enum') throw new Error('badge variant did not resolve as an enum');
    const descriptor = propFieldToFieldDescriptor('variant', variant);
    expect(descriptor.metadata).toEqual({ kind: 'enum', values: variant.values });
    expect(descriptor.defaultValue).toBe('default');
  });
});

/**
 * AC1 as literally written (#2165): the graph is built FROM REGISTRY OUTPUT,
 * never from a hand-written fixture. Every served component and composite is
 * loaded, parsed through the CLI's RegistryItemSchema (the shape the MCP
 * actually consumes), assembled with the real assembleGraph, and then walked
 * RECURSIVELY through describe(): every node's expansion, every prop child,
 * every composesWith edge, every part, compared against the registry item it
 * came from. A prop the registry extracted that the graph cannot resolve, or
 * the reverse, fails here for every component, not only for badge.
 */
describe('registry output feeds the graph, wide and recursive (#2165)', () => {
  const fixturesDir = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures');
  type CliRegistryItem = ReturnType<typeof RegistryItemSchema.parse>;
  type CliPropField = CliRegistryItem['facets'] extends infer F
    ? F extends Partial<Record<string, { props: Record<string, infer P> }>> | undefined
      ? P
      : never
    : never;
  let prevCompositesDir: string | undefined;
  let byName: Map<string, CliRegistryItem>;
  let graph: Graph;

  beforeAll(() => {
    prevCompositesDir = process.env['RAFTERS_COMPOSITES_DIR'];
    process.env['RAFTERS_COMPOSITES_DIR'] = fixturesDir;
    const items = [...loadAllComponents(), ...loadAllComposites()].map((item) =>
      RegistryItemSchema.parse(item),
    );
    byName = new Map(items.map((item) => [item.name, item]));
    graph = assembleGraph(items);
  });

  afterAll(() => {
    if (prevCompositesDir === undefined) delete process.env['RAFTERS_COMPOSITES_DIR'];
    else process.env['RAFTERS_COMPOSITES_DIR'] = prevCompositesDir;
  });

  // What describe() hands an agent: the registry field with a grammar prop's
  // token vocab stripped (graph.ts toAgentProp).
  function agentView(field: CliPropField): Record<string, unknown> {
    if (field.type === 'grammar') {
      const { vocab: _vocab, ...rest } = field;
      return rest;
    }
    return field;
  }

  function reactProps(id: string): Record<string, CliPropField> {
    return byName.get(id)?.facets?.react?.props ?? {};
  }

  function walk(id: string, visited: Set<string>, resolved: Set<string>): void {
    if (visited.has(id)) return;
    visited.add(id);
    expect(byName.has(id), `graph node ${id} came from no registry item`).toBe(true);

    // The node expanded: every prop resolved inline, equal to the registry's.
    const expanded = describeGraph(`${id}.*`, graph, 'react') as ExpandedNodeResult;
    expect(expanded.id, `${id}.* did not expand`).toBe(id);
    const expectedProps = Object.fromEntries(
      Object.entries(reactProps(id)).map(([name, field]) => [name, agentView(field)]),
    );
    expect(expanded.props, `${id}.* props`).toEqual(expectedProps);

    // Layer 0 advertises the children; each one resolves, and the walk descends
    // through every part and every composesWith edge.
    const layer = describeGraph(id, graph, 'react') as NodeResult;
    expect(layer.id, `${id} layer 0`).toBe(id);
    for (const child of layer.children) {
      if (child.type === 'edge') {
        const edges = describeGraph(child.addr, graph, 'react') as NodeResult[];
        expect(edges.length, child.addr).toBeGreaterThan(0);
        for (const edge of edges) walk(edge.id, visited, resolved);
        continue;
      }
      if (child.type === 'part') {
        walk(child.addr, visited, resolved);
        continue;
      }
      const propName = child.addr.slice(`${id}.props.`.length);
      const field = reactProps(id)[propName];
      expect(field, `${child.addr} advertised but not in the registry item`).toBeDefined();
      if (field === undefined) continue;
      expect(describeGraph(child.addr, graph, 'react'), child.addr).toEqual(agentView(field));
      resolved.add(child.addr);
    }
  }

  it('resolves every served node, every prop child, every edge, and every part', () => {
    const visited = new Set<string>();
    const resolved = new Set<string>();
    for (const id of graph.nodes.keys()) walk(id, visited, resolved);
    expect(visited.size).toBe(graph.nodes.size);

    // Wide: the walk reached every react prop the registry extracted, and
    // nothing else -- the graph neither drops nor invents a prop.
    const extracted = new Set<string>();
    for (const item of byName.values()) {
      for (const name of Object.keys(item.facets?.react?.props ?? {})) {
        extracted.add(`${item.name}.props.${name}`);
      }
    }
    expect(resolved).toEqual(extracted);
    expect(extracted.size).toBeGreaterThan(0);
  });

  it('the components the regex path returned props: {} for are non-empty through the graph', () => {
    for (const id of ['badge', 'container', 'grid', 'input', 'card', 'sidebar']) {
      const expanded = describeGraph(`${id}.*`, graph, 'react') as ExpandedNodeResult;
      expect(Object.keys(expanded.props).length, id).toBeGreaterThan(0);
    }
  });

  it("badge's variant reaches the agent as BADGE_VARIANTS, in order, with its default", () => {
    const expanded = describeGraph('badge.*', graph, 'react') as ExpandedNodeResult;
    expect(expanded.props['variant']).toEqual({
      type: 'enum',
      values: [
        'default',
        'primary',
        'secondary',
        'destructive',
        'success',
        'warning',
        'info',
        'muted',
        'accent',
        'outline',
        'ghost',
        'link',
      ],
      default: 'default',
    });
    expect(describeGraph('badge.props.variant.?', graph, 'react')).not.toBeNull();
  });

  it('a renamed destructure default survives the trip through the graph', () => {
    expect(describeGraph('container.props.as', graph, 'react')).toEqual({
      type: 'enum',
      values: ['div', 'main', 'header', 'footer', 'section', 'article', 'aside'],
      default: 'div',
    });
  });
});
