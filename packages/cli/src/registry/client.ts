/**
 * Registry Client
 *
 * Fetches components and primitives from the rafters registry.
 */

import {
  type RegistryIndex,
  RegistryIndexSchema,
  type RegistryItem,
  RegistryItemSchema,
} from './types.js';

const DEFAULT_REGISTRY_URL = 'https://rafters.studio';

/**
 * Registry client for fetching components and primitives
 */
export class RegistryClient {
  private baseUrl: string;
  private cache = new Map<string, RegistryItem>();

  constructor(baseUrl: string = DEFAULT_REGISTRY_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Fetch the registry index
   */
  async fetchIndex(): Promise<RegistryIndex> {
    const url = `${this.baseUrl}/registry/index.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch registry index: ${response.status} ${response.statusText}`);
    }

    const data: unknown = await response.json();
    return RegistryIndexSchema.parse(data);
  }

  /**
   * Fetch a component by name
   */
  async fetchComponent(name: string): Promise<RegistryItem> {
    // Check cache first
    const cacheKey = `component:${name}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${this.baseUrl}/registry/components/${name}.json`;
    const response = await fetch(url);

    if (response.status === 404) {
      throw new Error(`Component "${name}" not found`);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch component "${name}": ${response.status} ${response.statusText}`,
      );
    }

    const data: unknown = await response.json();
    const item = RegistryItemSchema.parse(data);

    // Cache the result
    this.cache.set(cacheKey, item);

    return item;
  }

  /**
   * Fetch a primitive by name
   */
  async fetchPrimitive(name: string): Promise<RegistryItem> {
    // Check cache first
    const cacheKey = `primitive:${name}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${this.baseUrl}/registry/primitives/${name}.json`;
    const response = await fetch(url);

    if (response.status === 404) {
      throw new Error(`Primitive "${name}" not found`);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch primitive "${name}": ${response.status} ${response.statusText}`,
      );
    }

    const data: unknown = await response.json();
    const item = RegistryItemSchema.parse(data);

    // Cache the result
    this.cache.set(cacheKey, item);

    return item;
  }

  /**
   * Fetch a composite by name
   */
  async fetchComposite(name: string): Promise<RegistryItem> {
    const cacheKey = `composite:${name}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `${this.baseUrl}/registry/composites/${name}.json`;
    const response = await fetch(url);

    if (response.status === 404) {
      throw new Error(`Composite "${name}" not found`);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch composite "${name}": ${response.status} ${response.statusText}`,
      );
    }

    const data: unknown = await response.json();
    const item = RegistryItemSchema.parse(data);

    this.cache.set(cacheKey, item);

    return item;
  }

  /**
   * Fetch a registry item (component or primitive) by name
   * Tries component first, then primitive
   */
  async fetchItem(name: string): Promise<RegistryItem> {
    try {
      return await this.fetchComponent(name);
    } catch (err) {
      // If component not found, try primitive
      if (err instanceof Error && err.message.includes('not found')) {
        try {
          return await this.fetchPrimitive(name);
        } catch {
          // Re-throw original error if primitive also not found
          throw err;
        }
      }
      throw err;
    }
  }

  /**
   * List all available components
   */
  async listComponents(): Promise<Array<{ name: string; description?: string }>> {
    const index = await this.fetchIndex();
    return index.components.map((name) => ({ name }));
  }

  /**
   * List all available composites
   */
  async listComposites(): Promise<Array<{ name: string; description?: string }>> {
    const index = await this.fetchIndex();
    return index.composites.map((name) => ({ name }));
  }

  /**
   * Check if a component exists in the registry
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
   * Check if a primitive exists in the registry
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
   * Resolve all dependencies for a component recursively
   * Returns items in installation order (dependencies first)
   */
  async resolveDependencies(name: string, resolved = new Set<string>()): Promise<RegistryItem[]> {
    if (resolved.has(name)) {
      return [];
    }

    const item = await this.fetchItem(name);
    resolved.add(name);

    const deps: RegistryItem[] = [];

    // Resolve primitive dependencies first
    for (const dep of item.primitives) {
      if (!resolved.has(dep)) {
        const depItems = await this.resolveDependencies(dep, resolved);
        deps.push(...depItems);
      }
    }

    // Add the item itself after its dependencies
    deps.push(item);

    return deps;
  }
}

/**
 * Default registry client instance
 */
export const registryClient = new RegistryClient();
