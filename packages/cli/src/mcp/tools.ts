/**
 * MCP Tools for Rafters Design System
 *
 * 4 focused tools for agent ASSEMBLY (not design):
 *
 * 1. rafters_composite - Query composites with designer intent
 * 2. rafters_pattern - Design pattern guidance (do/never)
 * 3. rafters_component - Component intelligence
 * 4. rafters_workspaces - List available workspaces
 *
 * Agents assemble from pre-made decisions. Token design lives in Studio.
 * Token import lives in `rafters init` / `rafters import`, not MCP.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  type CompositeFile,
  getAllComposites,
  getComposite,
  getCompositesByCategory,
  registerComposite,
  searchComposites,
} from '@rafters/composites';
// node-fs adapter lives behind the server-only subpath (it imports node:fs).
import { discoverFromDirs } from '@rafters/composites/node';
import { z } from 'zod';
import { migrateConfig, type RaftersConfig } from '../commands/init.js';
import { RegistryClient, registryClient } from '../registry/client.js';
import { getRaftersPaths, PathFieldSchema, resolveReadSet } from '../utils/paths.js';
import { resolveWorkspace, type Workspace } from '../utils/workspaces.js';

/**
 * The config fields the MCP may write -- the WIRING, everything that is not a
 * designer decision. The three designer-owned fields (intent, darkMode, fonts)
 * belong to Studio; `installed` is managed by `rafters add`. Those are rejected
 * by handleConfigure with a pointer to the right surface, so this write path
 * structurally cannot remove designer choice.
 */
const ConfigWiringSchema = z
  .object({
    // Closed set -- excludes 'unknown', which is a detection sentinel, not a
    // valid target a caller may set.
    framework: z.enum(['next', 'vite', 'remix', 'react-router', 'astro', 'wc', 'vanilla']),
    registryUrl: z.string().min(1),
    componentTarget: z.string().min(1),
    source: z.string().min(1),
    cssPath: z.union([z.string(), z.null()]),
    componentsPath: PathFieldSchema,
    primitivesPath: PathFieldSchema,
    compositesPath: PathFieldSchema,
    rulesPath: PathFieldSchema,
    exports: z
      .object({
        tailwind: z.boolean(),
        typescript: z.boolean(),
        dtcg: z.boolean(),
        compiled: z.boolean(),
        documentation: z.boolean(),
      })
      .partial(),
  })
  .partial()
  .strict();

/** Designer-owned config keys the MCP must never write -- Studio owns these. */
const STUDIO_OWNED_KEYS = ['intent', 'darkMode', 'fonts'] as const;
/** Config keys `rafters add` manages -- the MCP must not write these either. */
const ADD_MANAGED_KEYS = ['installed'] as const;

const WORKSPACE_PARAM = {
  workspace: {
    type: 'string',
    description:
      'Workspace name (directory basename). Required when the MCP session has multiple workspaces and none matches cwd. Call rafters_workspaces to list options.',
  },
} as const;

// ==================== Tool Definitions ====================

export const TOOL_DEFINITIONS = [
  {
    name: 'rafters_workspaces',
    description:
      "List rafters workspaces, or update a workspace's WIRING config. Called with no arguments (or just `workspace`): returns each workspace name, path, and which is the default for unscoped tool calls -- call this first when the project might be a monorepo. Called with any wiring field: updates that workspace's .rafters/config.rafters.json -- framework, registryUrl, componentTarget, source, cssPath, and the path fields (componentsPath, primitivesPath, compositesPath, rulesPath) and exports; only fields you pass change. Cannot set designer decisions (intent, darkMode, fonts) -- those are set in Studio -- and cannot set installed -- that is managed by `rafters add`.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        framework: { type: 'string', description: 'Target framework (e.g., "react", "astro")' },
        registryUrl: {
          type: 'string',
          description: 'Registry to install from / query. Point at your own internal registry.',
        },
        componentTarget: { type: 'string', description: 'Where installed components are written' },
        source: { type: 'string', description: 'Design system this project was imported from' },
        cssPath: { type: ['string', 'null'], description: 'Path to the main CSS file, or null' },
        componentsPath: {
          oneOf: [{ type: 'string' }, { type: 'array' }],
          description: 'Folder(s) to read/write components. String or array of entries.',
        },
        primitivesPath: {
          oneOf: [{ type: 'string' }, { type: 'array' }],
          description: 'Folder(s) to read/write primitives. String or array of entries.',
        },
        compositesPath: {
          oneOf: [{ type: 'string' }, { type: 'array' }],
          description: 'Folder(s) to read/write composites. String or array of entries.',
        },
        rulesPath: {
          oneOf: [{ type: 'string' }, { type: 'array' }],
          description: 'Folder(s) to read/write rules. String or array of entries.',
        },
        exports: {
          type: 'object',
          description:
            'Which output formats to emit (tailwind, typescript, dtcg, compiled, documentation).',
        },
      },
      required: [],
    },
  },
  {
    name: 'rafters_composite',
    description:
      'Query composites by ID, search term, or category. Returns designer intent (solves, appliesWhen, do/never), I/O rules for chaining, and block structure.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        id: { type: 'string', description: 'Get a specific composite by ID' },
        query: { type: 'string', description: 'Fuzzy search by name/keywords' },
        category: { type: 'string', description: 'Filter by category' },
      },
      required: [],
    },
  },
  {
    name: 'rafters_pattern',
    description:
      'Get design pattern guidance by querying composites. Search by what the pattern solves (e.g., "authentication", "data entry", "navigation") to get do/never rules, cognitive load, and designer intent.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        solves: {
          type: 'string',
          description: 'What problem the pattern solves (searches composite solves field)',
        },
        query: {
          type: 'string',
          description: 'Fuzzy search across composite names, keywords, and descriptions',
        },
      },
      required: [],
    },
  },
  {
    name: 'rafters_component',
    description:
      'Get component intelligence: cognitive load, accessibility, do/never guidance, variants, sizes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        name: {
          type: 'string',
          description: 'Component name (e.g., "button", "dialog", "card")',
        },
      },
      required: ['name'],
    },
  },
] as const;

// ==================== Tool Handler ====================

export class RaftersToolHandler {
  private workspaces: Workspace[];
  private defaultWorkspace: Workspace | null;
  /** Tracks per-workspace composite loading so we only read from disk once. */
  private compositesLoadedFor = new Set<string>();
  /** Tracks built-in composite loading separately (loaded once globally). */
  private builtInCompositesLoaded = false;
  /**
   * Registry clients keyed by base URL, so each workspace's `registryUrl` gets
   * its own fetch cache. Workspaces without a configured URL share the default
   * singleton (which points at the public registry).
   */
  private registryClients = new Map<string, RegistryClient>();

  constructor(workspaces: Workspace[], defaultWorkspace: Workspace | null) {
    this.workspaces = workspaces;
    this.defaultWorkspace = defaultWorkspace;
  }

  async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    switch (name) {
      case 'rafters_workspaces':
        return this.handleWorkspaces(args);
      case 'rafters_composite':
        return this.handleComposite(args);
      case 'rafters_pattern':
        return this.handlePattern(args as { solves?: string; query?: string; workspace?: string });
      case 'rafters_component':
        return this.handleComponent(args.name as string, args.workspace as string | undefined);
      default:
        return this.errorResult(`Unknown tool: ${name}`, {
          suggestion:
            'Available tools: rafters_workspaces, rafters_composite, rafters_pattern, rafters_component.',
        });
    }
  }

  /**
   * Resolve the requested workspace, returning a structured error result when
   * the agent didn't pick one and there's no default. Returns the default
   * workspace (which may itself be null when no `.rafters/` exists at all)
   * for tools that read agent-shipped data and can degrade gracefully.
   */
  private resolve(name: string | undefined): Workspace | null {
    return resolveWorkspace(this.workspaces, this.defaultWorkspace, name);
  }

  /**
   * Build a structured error response listing the available workspaces.
   * Use this when a tool requires a workspace and the agent didn't pick one.
   */
  private workspaceRequiredError(): CallToolResult {
    return this.errorResult('workspace parameter required', {
      suggestion:
        'Multiple workspaces are available. Pass `workspace` with one of the names below.',
      workspaces: this.workspaces.map((w) => ({ name: w.name, root: w.root })),
    });
  }

  /** Wrap a JSON-serialisable payload as a text tool result. */
  private jsonResult(payload: unknown): CallToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
  }

  /** Wrap an error string (with optional extra fields) as a tool result. */
  private errorResult(error: string, extra?: Record<string, unknown>): CallToolResult {
    return this.jsonResult({ error, ...extra });
  }

  /**
   * List workspaces, or -- when any wiring field is present -- update the
   * target workspace's config. `workspace` selects which; every other key is
   * treated as a wiring patch. No wiring keys means the list query.
   */
  private async handleWorkspaces(args: Record<string, unknown>): Promise<CallToolResult> {
    const { workspace, ...patch } = args;

    if (Object.keys(patch).length === 0) {
      return this.jsonResult({
        workspaces: this.workspaces.map((w) => ({
          name: w.name,
          root: w.root,
          isDefault: w.name === this.defaultWorkspace?.name,
        })),
        defaultWorkspace: this.defaultWorkspace?.name ?? null,
      });
    }

    return this.updateWorkspaceConfig(workspace as string | undefined, patch);
  }

  /**
   * Write a WIRING patch to a workspace's config.rafters.json. Rejects the
   * designer-owned keys (intent, darkMode, fonts -> Studio) and add-managed
   * keys (installed -> `rafters add`) with a pointer to the right surface, so
   * this path structurally cannot remove designer choice. Only the fields in
   * the patch change; everything else in the config is preserved.
   */
  private async updateWorkspaceConfig(
    workspaceName: string | undefined,
    patch: Record<string, unknown>,
  ): Promise<CallToolResult> {
    const resolved = this.resolve(workspaceName);
    if (!resolved) {
      // A write needs a concrete target -- when none resolves, list the options.
      return this.workspaceRequiredError();
    }

    const studioKeys = STUDIO_OWNED_KEYS.filter((k) => k in patch);
    if (studioKeys.length > 0) {
      return this.errorResult(
        `${studioKeys.join(', ')} ${studioKeys.length > 1 ? 'are' : 'is'} a designer decision owned by Rafters Studio, not the MCP. Set ${studioKeys.length > 1 ? 'them' : 'it'} in Studio.`,
      );
    }
    const addKeys = ADD_MANAGED_KEYS.filter((k) => k in patch);
    if (addKeys.length > 0) {
      return this.errorResult(`${addKeys.join(', ')} is managed by \`rafters add\`, not the MCP.`);
    }

    const result = ConfigWiringSchema.safeParse(patch);
    if (!result.success) {
      return this.errorResult(`invalid wiring patch: ${result.error.message}`);
    }
    if (Object.keys(result.data).length === 0) {
      return this.errorResult('no writable wiring fields provided');
    }

    const config = await this.readConfig(resolved.root);
    if (!config) {
      return this.errorResult(
        `no config at ${getRaftersPaths(resolved.root).config} -- run \`rafters init\` first`,
      );
    }

    // Runtime-safe: zod omits absent keys, so this only overwrites provided
    // wiring fields. The cast bridges RaftersConfig's nominal field types
    // (Framework, ComponentTarget, PathField) that the merge widens under
    // exactOptionalPropertyTypes.
    const updated = { ...config, ...result.data } as RaftersConfig;
    await this.writeConfig(resolved.root, updated);

    // Invalidate cache derived from config so subsequent reads see the change.
    // registryUrl is picked up fresh by registryClientFor; a changed
    // compositesPath needs the per-workspace composite load to re-run.
    if ('compositesPath' in result.data) {
      this.compositesLoadedFor.delete(resolved.root);
    }

    return this.jsonResult({ ok: true, workspace: resolved.name, updated: result.data });
  }

  /**
   * Recursively discover composites under the given directories via the shared
   * discovery core (node-fs adapter), then register each into the in-memory
   * registry. Duplicate ids -- across this call or against already-registered
   * composites -- are ignored: the first registration wins.
   */
  private async loadCompositesFromDirs(...dirs: string[]): Promise<void> {
    const { registry } = await discoverFromDirs(...dirs);
    for (const composite of registry.values()) {
      try {
        registerComposite(composite);
      } catch {
        // Already registered -- first one wins.
      }
    }
  }

  private async ensureCompositesLoaded(workspace: Workspace | null): Promise<void> {
    if (!this.builtInCompositesLoaded) {
      await this.loadCompositesFromDirs(
        join(process.cwd(), 'node_modules/@rafters/composites/src/typography'),
      );
      this.builtInCompositesLoaded = true;
    }

    if (workspace && !this.compositesLoadedFor.has(workspace.root)) {
      await this.loadCompositesFromDirs(...(await this.compositeReadRoots(workspace.root)));
      this.compositesLoadedFor.add(workspace.root);
    }
  }

  /**
   * Read and migrate a workspace's `.rafters/config.rafters.json`. Returns null
   * when the file is absent or unparseable. The single config read the MCP
   * tools share -- composite paths and the registry URL both come through here.
   */
  private async readConfig(workspaceRoot: string): Promise<RaftersConfig | null> {
    const paths = getRaftersPaths(workspaceRoot);
    try {
      return migrateConfig(
        JSON.parse(await readFile(paths.config, 'utf-8')) as Record<string, unknown>,
      ) as unknown as RaftersConfig;
    } catch {
      return null;
    }
  }

  /** Persist a workspace's config back to `.rafters/config.rafters.json`. */
  private async writeConfig(workspaceRoot: string, config: RaftersConfig): Promise<void> {
    const paths = getRaftersPaths(workspaceRoot);
    await writeFile(paths.config, `${JSON.stringify(config, null, 2)}\n`);
  }

  /**
   * Resolve the registry client for a workspace, honoring its configured
   * `registryUrl`. Workspaces with no config, or no `registryUrl`, share the
   * default singleton. Clients are cached per URL so each keeps its fetch cache.
   */
  private async registryClientFor(workspace: Workspace | null): Promise<RegistryClient> {
    if (!workspace) return registryClient;
    const url = (await this.readConfig(workspace.root))?.registryUrl;
    if (!url) return registryClient;
    let client = this.registryClients.get(url);
    if (!client) {
      client = new RegistryClient(url);
      this.registryClients.set(url, client);
    }
    return client;
  }

  /**
   * Resolve the set of folders to scan for composite manifests in a workspace.
   * Reads `.rafters/config.rafters.json` and applies the workspace's
   * `compositesPath` (which may be a string or an array of entries to support
   * shared packages like `@shingle/shared`). Falls back to `.rafters/composites`
   * when no config or compositesPath is set.
   */
  private async compositeReadRoots(workspaceRoot: string): Promise<string[]> {
    const paths = getRaftersPaths(workspaceRoot);
    const config = await this.readConfig(workspaceRoot);
    if (!config?.compositesPath) {
      return [join(paths.root, 'composites')];
    }
    return resolveReadSet(config.compositesPath, workspaceRoot);
  }

  private async handleComposite(args: Record<string, unknown>): Promise<CallToolResult> {
    const { id, query, category, workspace } = args as {
      id?: string;
      query?: string;
      category?: string;
      workspace?: string;
    };

    const resolved = this.resolve(workspace);
    if (workspace && !resolved) {
      return this.workspaceRequiredError();
    }

    await this.ensureCompositesLoaded(resolved);

    let composites: CompositeFile[];

    if (id) {
      const c = getComposite(id);
      composites = c ? [c] : [];
    } else if (query) {
      composites = searchComposites(query);
    } else if (category) {
      composites = getCompositesByCategory(category);
    } else {
      composites = getAllComposites();
    }

    const result = composites.map((c) => ({
      id: c.manifest.id,
      name: c.manifest.name,
      category: c.manifest.category,
      description: c.manifest.description,
      cognitiveLoad: c.manifest.cognitiveLoad,
      solves: c.manifest.solves,
      appliesWhen: c.manifest.appliesWhen,
      usagePatterns: c.manifest.usagePatterns,
      input: c.input,
      output: c.output,
      blockCount: c.blocks.length,
      // Surface which blocks carry which validation rules. Rules compile to
      // native HTML5 constraint attributes at build, so agents need to see
      // them to reason about a composite's behavior. Only blocks with rules
      // are listed -- the array is empty when nothing is constrained.
      blockRules: c.blocks
        .filter((b) => b.rules && b.rules.length > 0)
        .map((b) => ({ id: b.id, type: b.type, rules: b.rules })),
    }));

    return this.jsonResult({ composites: result });
  }

  private async handlePattern(args: {
    solves?: string;
    query?: string;
    workspace?: string;
  }): Promise<CallToolResult> {
    const { solves, query, workspace } = args;

    const resolved = this.resolve(workspace);
    if (workspace && !resolved) {
      return this.workspaceRequiredError();
    }

    await this.ensureCompositesLoaded(resolved);
    let composites: CompositeFile[];

    if (solves) {
      // Search composites by what they solve
      const all = getAllComposites();
      const solvesLower = solves.toLowerCase();
      composites = all.filter(
        (c) =>
          c.manifest.solves?.toLowerCase().includes(solvesLower) ||
          c.manifest.appliesWhen?.some((a) => a.toLowerCase().includes(solvesLower)),
      );
    } else if (query) {
      composites = searchComposites(query);
    } else {
      // Return all composites that have usagePatterns (do/never)
      composites = getAllComposites().filter((c) => c.manifest.usagePatterns);
    }

    if (composites.length === 0) {
      const all = getAllComposites();
      const available = all
        .filter((c) => c.manifest.solves || c.manifest.usagePatterns)
        .map((c) => ({
          id: c.manifest.id,
          solves: c.manifest.solves,
        }));

      return this.errorResult('No patterns found matching query', { available });
    }

    // Return pattern-focused view of composites
    const patterns = composites.map((c) => ({
      id: c.manifest.id,
      name: c.manifest.name,
      solves: c.manifest.solves,
      appliesWhen: c.manifest.appliesWhen,
      cognitiveLoad: c.manifest.cognitiveLoad,
      usagePatterns: c.manifest.usagePatterns,
    }));

    return this.jsonResult({ patterns });
  }

  private async handleComponent(
    componentName: string,
    workspaceName?: string,
  ): Promise<CallToolResult> {
    const resolved = this.resolve(workspaceName);
    if (workspaceName && !resolved) {
      return this.workspaceRequiredError();
    }

    try {
      const client = await this.registryClientFor(resolved);
      const item = await client.fetchComponent(componentName);

      return this.jsonResult({
        name: item.name,
        type: item.type,
        description: item.description,
        primitives: item.primitives,
        rules: item.rules,
        composites: item.composites,
        files: item.files,
        // The intelligence field carries the WHY of the component: cognitive
        // load, accessibility, do/never, semantic meaning. Extracted from JSDoc
        // by the registry generator and present on every component JSON.
        // Previously stripped by the schema (not declared) and not referenced by
        // the handler -- the tool's whole reason for existing went missing.
        intelligence: item.intelligence,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.errorResult(message);
    }
  }
}
