/**
 * Unit tests for RegistryClient dependency resolution across the behavior-layer
 * substrate item types (lib/hooks). Exercises the REAL fetchItem/resolveDependencies
 * walk with a stubbed fetch -- no server -- so the "rafters add pulls the full
 * closure" path (#1896) is verified, not just the loaders and transforms.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistryClient } from '../../src/registry/client.js';
import type { RegistryItem } from '../../src/registry/types.js';

const BASE = 'https://rafters.test';

function item(
  name: string,
  type: RegistryItem['type'],
  primitives: string[],
  path: string,
): RegistryItem {
  return {
    name,
    type,
    primitives,
    files: [{ path, content: `// ${name}`, dependencies: [], devDependencies: [] }],
    rules: [],
    composites: [],
  };
}

// A minimal graph: button -> classy (primitive), contract + use-memory
// (substrate, served under the flat substrate/ namespace, kind carried in the
// path); contract & use-memory both -> memory (primitive, deduped).
const GRAPH: Record<string, RegistryItem> = {
  'components/button': item(
    'button',
    'ui',
    ['classy', 'contract', 'use-memory'],
    'components/ui/button.tsx',
  ),
  'primitives/classy': item('classy', 'primitive', [], 'lib/primitives/classy.ts'),
  'primitives/memory': item('memory', 'primitive', [], 'lib/primitives/memory.ts'),
  'substrate/contract': item('contract', 'substrate', ['memory'], 'lib/contract.ts'),
  'substrate/use-memory': item('use-memory', 'substrate', ['memory'], 'hooks/use-memory.ts'),
};

beforeEach(() => {
  vi.stubGlobal('fetch', (url: string) => {
    const match = url.match(/\/registry\/([^/]+)\/([^/]+)\.json$/);
    const key = match ? `${match[1]}/${match[2]}` : '';
    const found = GRAPH[key];
    if (!found) {
      return Promise.resolve(new Response('not found', { status: 404 }));
    }
    return Promise.resolve(
      new Response(JSON.stringify(found), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RegistryClient resolves the substrate closure', () => {
  it('walks button through lib and hooks to a complete, deduped, ordered set', async () => {
    const client = new RegistryClient(BASE);
    const items = await client.resolveDependencies('button');
    const names = items.map((i) => i.name);

    // Every graph node resolved, deduped.
    expect(new Set(names)).toEqual(
      new Set(['memory', 'classy', 'contract', 'use-memory', 'button']),
    );
    expect(names.filter((n) => n === 'memory')).toHaveLength(1);

    // Dependencies precede the component that needs them (install order).
    expect(names[names.length - 1]).toBe('button');
    expect(names.indexOf('memory')).toBeLessThan(names.indexOf('contract'));
  });

  it('resolves substrate deps to the substrate type with kind-carrying paths', async () => {
    const client = new RegistryClient(BASE);
    const items = await client.resolveDependencies('button');
    const byName = new Map(items.map((i) => [i.name, i]));

    expect(byName.get('contract')?.type).toBe('substrate');
    expect(byName.get('contract')?.files[0].path).toBe('lib/contract.ts');
    expect(byName.get('use-memory')?.type).toBe('substrate');
    expect(byName.get('use-memory')?.files[0].path).toBe('hooks/use-memory.ts');
  });

  it('fetchItem falls through component/primitive endpoints to reach a substrate item', async () => {
    const client = new RegistryClient(BASE);
    // "contract" 404s as component and primitive, resolves under substrate/.
    const contract = await client.fetchItem('contract');
    expect(contract.type).toBe('substrate');
  });
});

describe('RegistryClient.fetchAllItems', () => {
  const CATALOG: RegistryItem[] = [
    item('button', 'ui', [], 'components/ui/button.tsx'),
    item('classy', 'primitive', [], 'lib/primitives/classy.ts'),
    item('login-form', 'composite', [], 'composites/login-form.composite.json'),
  ];
  const FOLDER_TYPE: Record<string, RegistryItem['type']> = {
    components: 'ui',
    primitives: 'primitive',
    composites: 'composite',
    rules: 'rule',
    substrate: 'substrate',
  };

  let bulkAvailable = true;
  let bulkCalls = 0;
  let itemCalls = 0;

  beforeEach(() => {
    bulkAvailable = true;
    bulkCalls = 0;
    itemCalls = 0;
    // Overrides the file-level stub: serves the bulk endpoint, the index, and
    // folder-aware per-item routes so both fetchAllItems paths are exercised.
    vi.stubGlobal('fetch', (url: string) => {
      if (url.endsWith('/registry/items.json')) {
        bulkCalls++;
        if (!bulkAvailable) {
          return Promise.resolve(new Response('no bulk route', { status: 404 }));
        }
        return Promise.resolve(new Response(JSON.stringify(CATALOG), { status: 200 }));
      }
      if (url.endsWith('/registry/index.json')) {
        const index = {
          name: 'rafters',
          homepage: 'https://rafters.test',
          components: ['button'],
          primitives: ['classy'],
          composites: ['login-form'],
          rules: [],
          substrate: [],
        };
        return Promise.resolve(new Response(JSON.stringify(index), { status: 200 }));
      }
      const match = url.match(/\/registry\/([^/]+)\/([^/]+)\.json$/);
      if (match) {
        const [, folder, name] = match;
        const found = CATALOG.find((c) => c.name === name && c.type === FOLDER_TYPE[folder]);
        if (found) {
          itemCalls++;
          return Promise.resolve(new Response(JSON.stringify(found), { status: 200 }));
        }
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    });
  });

  it('loads the whole catalog in a single bulk round-trip, no per-item fetch', async () => {
    const client = new RegistryClient(BASE);
    const items = await client.fetchAllItems();

    expect(items.map((i) => i.name)).toEqual(['button', 'classy', 'login-form']);
    expect(bulkCalls).toBe(1);
    expect(itemCalls).toBe(0);
  });

  it('falls back to the per-item loop when the bulk endpoint is absent (404)', async () => {
    bulkAvailable = false;
    const client = new RegistryClient(BASE);
    const items = await client.fetchAllItems();

    expect(new Set(items.map((i) => i.name))).toEqual(new Set(['button', 'classy', 'login-form']));
    // Bulk was attempted once, then the fallback fetched each item.
    expect(bulkCalls).toBe(1);
    expect(itemCalls).toBeGreaterThan(0);
  });
});
