import { describe, expect, it } from 'vitest';
import {
  getRegistryIndex,
  listComponentNames,
  listHookNames,
  listLibNames,
  listPrimitiveNames,
  loadComponent,
  loadHook,
  loadLib,
  loadPrimitive,
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

describe('registry resolves the behavior-layer runtime substrate (lib/hooks)', () => {
  it('lists lib and hooks names, excluding tests and the barrel index', () => {
    const lib = listLibNames();
    const hooks = listHookNames();
    expect(lib).toContain('contract');
    expect(lib).toContain('compose');
    expect(hooks).toContain('use-memory');
    expect(lib).not.toContain('index');
    expect(hooks).not.toContain('index');
    expect(lib.every((n) => !n.endsWith('.test'))).toBe(true);
  });

  it('exposes lib and hooks in the registry index', () => {
    const index = getRegistryIndex();
    expect(index.lib).toContain('contract');
    expect(index.hooks).toContain('use-memory');
  });

  it('serves a lib file to @/lib with its transitive deps', () => {
    const contract = loadLib('contract');
    if (!contract) throw new Error('contract did not load');
    expect(contract.type).toBe('lib');
    expect(contract.files.map((f) => f.path)).toEqual(['lib/contract.ts']);
    // contract imports ../primitives/memory (value) -> resolvable primitive dep
    expect(contract.primitives).toContain('memory');
  });

  it('serves a hook file to @/hooks with react and its substrate deps', () => {
    const useMemory = loadHook('use-memory');
    if (!useMemory) throw new Error('use-memory did not load');
    expect(useMemory.type).toBe('hooks');
    expect(useMemory.files.map((f) => f.path)).toEqual(['hooks/use-memory.ts']);
    expect(useMemory.files[0].dependencies).toContain('react@19.2.0');
    expect(useMemory.primitives).toContain('memory');
  });

  it('captures TYPE-ONLY substrate imports (compose depends on contract)', () => {
    // compose imports `type ... from './contract'` -- type-only, but the file
    // must still install for tsc, so it must appear as a dependency.
    const compose = loadLib('compose');
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

  it('returns null for an unknown lib/hook name', () => {
    expect(loadLib('does-not-exist')).toBeNull();
    expect(loadHook('does-not-exist')).toBeNull();
  });

  it('component, primitive, lib, and hook name sets are pairwise DISJOINT', () => {
    // fetchItem resolves a dep name by trying endpoints in order. If a name
    // lived in two categories, `rafters add` would fetch the wrong item (e.g. a
    // component named the same as a lib file would shadow the substrate). The
    // whole uniform-name resolution depends on these sets never overlapping.
    const sets = {
      components: listComponentNames(),
      primitives: listPrimitiveNames(),
      lib: listLibNames(),
      hooks: listHookNames(),
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
    return loadComponent(name) ?? loadPrimitive(name) ?? loadLib(name) ?? loadHook(name);
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
