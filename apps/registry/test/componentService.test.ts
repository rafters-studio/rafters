import { describe, expect, it } from 'vitest';
import {
  extractDepsFromSource,
  getRegistryIndex,
  listComponentNames,
  listPrimitiveNames,
  listSubstrate,
  listSubstrateKinds,
  loadComponent,
  loadPrimitive,
  loadSubstrate,
  parseJSDocFromSource,
  propFieldToFieldDescriptor,
  type RegistryItem,
} from '../src/lib/registry/componentService';

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
 * The `@constraint` JSDoc tag (#2073). These tests exercise the parser case
 * added to parseJSDocFromSource directly, against inline source.
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

describe('ordinary components serve flat paths', () => {
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
});

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
});

/**
 * #2219: `@dependencies none` (used across several editor primitives to
 * document "no external dependencies") was parsed as a literal package name.
 * `rafters add editor` on 0.3.1 then ran `pnpm add none`, installing whatever
 * package a stranger holds under that name. An item with no external
 * dependencies must emit an empty list, never a placeholder string.
 */
describe('extractDepsFromSource placeholder handling (#2219)', () => {
  it('treats "none" as no external dependencies', () => {
    const source = `/**\n * @dependencies none\n */\nexport const x = 1;\n`;
    expect(extractDepsFromSource(source)).toEqual({ dependencies: [], devDependencies: [] });
  });

  it('treats "n/a" as no external dependencies', () => {
    const source = `/**\n * @dependencies n/a\n */\nexport const x = 1;\n`;
    expect(extractDepsFromSource(source)).toEqual({ dependencies: [], devDependencies: [] });
  });

  it('never emits an empty-string dependency entry', () => {
    const source = `/**\n * @dependencies  \n */\nexport const x = 1;\n`;
    expect(extractDepsFromSource(source)).toEqual({ dependencies: [], devDependencies: [] });
  });

  it('still recognizes a real dependency alongside a placeholder-free tag', () => {
    const source = `/**\n * @dependencies nanostores\n */\nexport const x = 1;\n`;
    expect(extractDepsFromSource(source)).toEqual({
      dependencies: ['nanostores'],
      devDependencies: [],
    });
  });

  it('applies the same placeholder handling to @devDependencies', () => {
    const source = `/**\n * @devDependencies none\n */\nexport const x = 1;\n`;
    expect(extractDepsFromSource(source)).toEqual({ dependencies: [], devDependencies: [] });
  });
});

/**
 * #2325: typography.astro builds its named exports with `createComponent`
 * from `astro/runtime/server/index.js`. That is a subpath of a package the
 * consumer already has, not a package -- and `pnpm add
 * astro/runtime/server/index.js` fails, since the CLI's install path skips a
 * dependency only on an exact name match against the consumer's package.json.
 * The registry must never emit an `astro/` subpath as a dependency.
 */
describe('astro subpaths are never registry dependencies (#2325)', () => {
  it('typography.astro imports the runtime subpath and lists no astro/ dependency', () => {
    const typography = loadComponent('typography');
    const astroFile = typography?.files.find((f) => f.path === 'components/ui/typography.astro');
    if (!astroFile) throw new Error('typography.astro did not load');
    // The mechanism is present in the served source...
    expect(astroFile.content).toContain("from 'astro/runtime/server/index.js'");
    // ...and never surfaces as something to install.
    expect(astroFile.dependencies).not.toContain('astro/runtime/server/index.js');
    expect(astroFile.dependencies.filter((dep) => dep.startsWith('astro/'))).toEqual([]);
  });

  it('no delivered component file lists an astro/ subpath as a dependency', () => {
    const offenders: string[] = [];
    for (const name of listComponentNames()) {
      for (const file of loadComponent(name)?.files ?? []) {
        for (const dep of file.dependencies) {
          if (dep.startsWith('astro/')) offenders.push(`${file.path}: ${dep}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
