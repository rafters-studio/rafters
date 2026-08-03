import { type OverrideKind, OverrideKindSchema } from '@rafters/shared';
import { z } from 'zod';

export type Plugin = {
  name: string;
  inputSchema: z.ZodType<unknown>;
  outputSchema: z.ZodType<unknown>;
  dependsOn(input: unknown): readonly string[];
  transform(input: unknown, get: (name: string) => unknown): unknown;
};

export const UserOverrideSchema = z.object({
  previousValue: z.unknown(),
  reason: z.string(),
  context: z.string().optional(),
  // Provenance. Optional by design: absent means unknown, which is what every
  // override written before this field existed actually is.
  kind: OverrideKindSchema.optional(),
});

export type UserOverride = z.infer<typeof UserOverrideSchema>;

export const BindingSchema = z.object({
  plugin: z.string(),
  input: z.unknown(),
});

export type Binding = z.infer<typeof BindingSchema>;

export const NodeSchema = z.object({
  name: z.string(),
  value: z.unknown(),
  binding: BindingSchema.optional(),
  userOverride: UserOverrideSchema.optional(),
});

export type Node = z.infer<typeof NodeSchema>;

export type SetOptions = {
  reason: string;
  context?: string;
  kind?: OverrideKind;
};

export class CircularDependencyError extends Error {
  constructor(public readonly cycle: readonly string[]) {
    super(`Circular dependency: ${cycle.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class UnknownPluginError extends Error {
  constructor(public readonly pluginName: string) {
    super(`Unknown plugin: ${pluginName}`);
    this.name = 'UnknownPluginError';
  }
}

export class TokenGraph {
  private nodes = new Map<string, Node>();
  private plugins = new Map<string, Plugin>();
  private snapshot: Map<string, Node> | null = null;

  constructor(plugins: readonly Plugin[] = []) {
    for (const plugin of plugins) this.plugins.set(plugin.name, plugin);
  }

  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  set(name: string, value: unknown, options: SetOptions): void {
    this.takeSnapshot();
    const existing = this.nodes.get(name);
    const next: Node = {
      name,
      value,
      userOverride: {
        previousValue: existing?.value,
        reason: options.reason,
        ...(options.context ? { context: options.context } : {}),
        ...(options.kind ? { kind: options.kind } : {}),
      },
      ...(existing?.binding ? { binding: existing.binding } : {}),
    };
    this.nodes.set(name, next);
    this.cascadeFrom(name);
  }

  // Hydrate a node from persisted state. No cascade fires; the caller
  // (registry constructor) is responsible for ordering: leaves first, then
  // bindings. userOverride / binding are preserved verbatim from the persisted
  // token so that the anchor + re-derivation hook both survive reload.
  seed(
    name: string,
    value: unknown,
    extras?: { userOverride?: UserOverride; binding?: Binding },
  ): void {
    this.nodes.set(name, {
      name,
      value,
      ...(extras?.userOverride ? { userOverride: extras.userOverride } : {}),
      ...(extras?.binding ? { binding: extras.binding } : {}),
    });
  }

  bind(name: string, pluginName: string, input: unknown): void {
    const plugin = this.requirePlugin(pluginName);
    plugin.inputSchema.parse(input);
    const directDeps = plugin.dependsOn(input);
    this.assertNoCycle(name, directDeps);

    this.takeSnapshot();
    const value = plugin.transform(input, (n) => this.get(n));
    plugin.outputSchema.parse(value);

    this.nodes.set(name, { name, value, binding: { plugin: pluginName, input } });
    this.cascadeFrom(name);
  }

  get(name: string): unknown {
    return this.nodes.get(name)?.value;
  }

  node(name: string): Node | undefined {
    return this.nodes.get(name);
  }

  undo(): void {
    if (!this.snapshot) return;
    this.nodes = this.snapshot;
    this.snapshot = null;
  }

  has(name: string): boolean {
    return this.nodes.has(name);
  }

  list(filter?: { namespace?: string }): readonly Node[] {
    const all = Array.from(this.nodes.values());
    if (!filter?.namespace) return all;
    const prefix = filter.namespace;
    return all.filter(
      (n) =>
        n.name === prefix || n.name.startsWith(`${prefix}-`) || n.name.startsWith(`${prefix}.`),
    );
  }

  size(): number {
    return this.nodes.size;
  }

  private requirePlugin(pluginName: string): Plugin {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) throw new UnknownPluginError(pluginName);
    return plugin;
  }

  private takeSnapshot(): void {
    this.snapshot = new Map();
    for (const [k, v] of this.nodes) this.snapshot.set(k, structuredClone(v));
  }

  private cascadeFrom(changed: string): void {
    const dependents = this.collectDependents(changed);
    if (dependents.size === 0) return;
    const ordered = this.topoSort(dependents);
    for (const name of ordered) {
      const node = this.nodes.get(name);
      if (!node || node.userOverride || !node.binding) continue;
      const plugin = this.requirePlugin(node.binding.plugin);
      const value = plugin.transform(node.binding.input, (n) => this.get(n));
      plugin.outputSchema.parse(value);
      this.nodes.set(name, { ...node, value });
    }
  }

  private collectDependents(changed: string): Set<string> {
    const out = new Set<string>();
    const queue = [changed];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const [name, node] of this.nodes) {
        if (out.has(name) || !node.binding) continue;
        const plugin = this.plugins.get(node.binding.plugin);
        if (!plugin) continue;
        if (plugin.dependsOn(node.binding.input).includes(current)) {
          out.add(name);
          queue.push(name);
        }
      }
    }
    return out;
  }

  private topoSort(names: ReadonlySet<string>): readonly string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (name: string, path: readonly string[]): void => {
      if (visited.has(name)) return;
      if (visiting.has(name)) throw new CircularDependencyError([...path, name]);
      visiting.add(name);
      const node = this.nodes.get(name);
      if (node?.binding) {
        const plugin = this.plugins.get(node.binding.plugin);
        if (plugin) {
          for (const dep of plugin.dependsOn(node.binding.input)) {
            if (names.has(dep)) visit(dep, [...path, name]);
          }
        }
      }
      visiting.delete(name);
      visited.add(name);
      sorted.push(name);
    };
    for (const name of names) visit(name, []);
    return sorted;
  }

  private assertNoCycle(name: string, directDeps: readonly string[]): void {
    const visited = new Set<string>();
    const dfs = (current: string, path: readonly string[]): void => {
      if (current === name) throw new CircularDependencyError([...path, current]);
      if (visited.has(current)) return;
      visited.add(current);
      const node = this.nodes.get(current);
      if (!node?.binding) return;
      const plugin = this.plugins.get(node.binding.plugin);
      if (!plugin) return;
      for (const dep of plugin.dependsOn(node.binding.input)) {
        dfs(dep, [...path, current]);
      }
    };
    for (const dep of directDeps) dfs(dep, [name]);
  }
}
