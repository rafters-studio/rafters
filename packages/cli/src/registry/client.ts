/**
 * Registry Client
 *
 * Fetches items (components, primitives, composites, rules) from the rafters registry.
 */

import { z } from 'zod';
import {
  type RegistryIndex,
  RegistryIndexSchema,
  type RegistryItem,
  RegistryItemSchema,
  type RegistryItemType,
} from './types.js';

const DEFAULT_REGISTRY_URL = 'https://rafters.studio';

/** The registry folder and human label for each item type. */
const REGISTRY_SOURCE: Record<RegistryItemType, { folder: string; label: string }> = {
  ui: { folder: 'components', label: 'Component' },
  primitive: { folder: 'primitives', label: 'Primitive' },
  composite: { folder: 'composites', label: 'Composite' },
  rule: { folder: 'rules', label: 'Rule' },
  substrate: { folder: 'substrate', label: 'Substrate' },
};

/** Order tried by fetchItem when the type is unknown -- the insertion order of REGISTRY_SOURCE. */
const FETCH_ORDER = Object.keys(REGISTRY_SOURCE) as RegistryItemType[];

type Fetcher = (name: string) => Promise<RegistryItem>;

/**
 * Registry client for fetching registry items.
 */
export class RegistryClient {
  private baseUrl: string;
  private cache = new Map<string, RegistryItem>();
  private readonly fetchByType: Record<RegistryItemType, Fetcher>;

  /** Typed fetchers -- one shared body, specialized per type. */
  readonly fetchComponent: Fetcher;
  readonly fetchPrimitive: Fetcher;
  readonly fetchComposite: Fetcher;
  readonly fetchRule: Fetcher;

  constructor(baseUrl: string = DEFAULT_REGISTRY_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');

    // The one fetch body -- a closure over baseUrl + cache, specialized by type.
    const fetchFrom =
      (type: RegistryItemType): Fetcher =>
      async (name) => {
        const { folder, label } = REGISTRY_SOURCE[type];
        const cacheKey = `${type}:${name}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const response = await fetch(`${this.baseUrl}/registry/${folder}/${name}.json`);
        if (response.status === 404) {
          throw new Error(`${label} "${name}" not found`);
        }
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${label.toLowerCase()} "${name}": ${response.status} ${response.statusText}`,
          );
        }

        const item = RegistryItemSchema.parse(await response.json());
        this.cache.set(cacheKey, item);
        return item;
      };

    this.fetchByType = {
      ui: fetchFrom('ui'),
      primitive: fetchFrom('primitive'),
      composite: fetchFrom('composite'),
      rule: fetchFrom('rule'),
      substrate: fetchFrom('substrate'),
    };
    this.fetchComponent = this.fetchByType.ui;
    this.fetchPrimitive = this.fetchByType.primitive;
    this.fetchComposite = this.fetchByType.composite;
    this.fetchRule = this.fetchByType.rule;
  }

  /**
   * Fetch the registry index.
   */
  async fetchIndex(): Promise<RegistryIndex> {
    const response = await fetch(`${this.baseUrl}/registry/index.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch registry index: ${response.status} ${response.statusText}`);
    }
    return RegistryIndexSchema.parse(await response.json());
  }

  /**
   * Fetch a registry item by name when the type is unknown.
   * Tries each source in order; a non-"not found" error (network, 5xx) aborts.
   */
  async fetchItem(name: string): Promise<RegistryItem> {
    for (const type of FETCH_ORDER) {
      try {
        return await this.fetchByType[type](name);
      } catch (err) {
        // Absent from this source -> try the next; a real error (network/5xx) aborts.
        if (err instanceof Error && err.message.includes('not found')) continue;
        throw err;
      }
    }
    throw new Error(`"${name}" not found in registry (component, primitive, composite, or rule)`);
  }

  /**
   * Fetch every registry item in one call, for the whole-catalog load the MCP
   * intel graph needs at startup.
   *
   * Prefers a single bulk round-trip against `/registry/items.json`. A registry
   * that does not serve that route -- an older deploy, or a third-party
   * `registryUrl` (which is user-configurable, see ConfigWiringSchema) -- returns
   * a non-2xx, and this falls back to looping `fetchItem` over `fetchIndex()`'s
   * name list, retaining today's per-item cost so no workspace's `describe` ever
   * hard-fails on a registry that predates the bulk endpoint.
   */
  async fetchAllItems(): Promise<RegistryItem[]> {
    const response = await fetch(`${this.baseUrl}/registry/items.json`);
    if (response.ok) {
      return z.array(RegistryItemSchema).parse(await response.json());
    }
    return this.fetchAllItemsByIndex();
  }

  /**
   * The fallback whole-catalog load: one `fetchItem` per name in the index,
   * across every describe-relevant kind. Deduped so a name appearing in more
   * than one index list is fetched once.
   */
  private async fetchAllItemsByIndex(): Promise<RegistryItem[]> {
    const index = await this.fetchIndex();
    const names = [
      ...index.components,
      ...index.primitives,
      ...index.composites,
      ...index.substrate,
    ];
    const seen = new Set<string>();
    const items: RegistryItem[] = [];
    for (const name of names) {
      if (seen.has(name)) continue;
      seen.add(name);
      items.push(await this.fetchItem(name));
    }
    return items;
  }

  /**
   * List all available components.
   */
  async listComponents(): Promise<Array<{ name: string; description?: string }>> {
    const index = await this.fetchIndex();
    return index.components.map((name) => ({ name }));
  }

  /**
   * List all available composites.
   */
  async listComposites(): Promise<Array<{ name: string; description?: string }>> {
    const index = await this.fetchIndex();
    return index.composites.map((name) => ({ name }));
  }

  /**
   * Check if a component exists in the registry.
   */
  async componentExists(name: string): Promise<boolean> {
    try {
      const index = await this.fetchIndex();
      return index.components.includes(name);
    } catch {
      return false;
    }
  }

  /**
   * Check if a primitive exists in the registry.
   */
  async primitiveExists(name: string): Promise<boolean> {
    try {
      const index = await this.fetchIndex();
      return index.primitives.includes(name);
    } catch {
      return false;
    }
  }

  /**
   * Resolve all dependencies for an item recursively.
   * Returns items in installation order (dependencies first).
   */
  async resolveDependencies(name: string, resolved = new Set<string>()): Promise<RegistryItem[]> {
    if (resolved.has(name)) return [];

    const item = await this.fetchItem(name);
    resolved.add(name);

    const deps: RegistryItem[] = [];
    for (const dep of item.primitives) {
      if (!resolved.has(dep)) {
        deps.push(...(await this.resolveDependencies(dep, resolved)));
      }
    }
    deps.push(item);
    return deps;
  }
}

/**
 * Default registry client instance.
 */
export const registryClient = new RegistryClient();
