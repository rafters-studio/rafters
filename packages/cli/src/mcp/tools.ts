/**
 * MCP Tools for Rafters Design System
 *
 * The primary surface for agent ASSEMBLY (not design):
 *
 * 1. rafters_workspaces - List workspaces, or update a workspace's WIRING config.
 * 2. rafters_describe   - Recursively introspect the component/composite intel
 *                         graph. A dot-address resolves through the workspace
 *                         overlay (describeWithOverlay -> describe); a
 *                         natural-language address is handed to the intent
 *                         door instead (isNaturalLanguageQuery -> matchIntent,
 *                         #2075). This dispatcher is the ONLY seam that
 *                         composes graph.ts (#2072), overlay.ts (#2074), and
 *                         intent.ts (#2075); none of the three call each
 *                         other. The intent door is WIRED: it is
 *                         deterministic keyword matching over a small,
 *                         hand-curated tag axis, and it refuses below its
 *                         match threshold rather than guessing. #2166 (open)
 *                         is the follow-up that scores it against the intel
 *                         this tool already owns.
 * 3. rafters_generate   - Resolve a bare component name to ONE registry component
 *                         and return its authoritative, target-correct snippet
 *                         verbatim, with its content slots marked open for the
 *                         caller. A direct-name lookup runs first (tier b); on
 *                         a miss it falls back to the same intent door
 *                         rafters_describe uses (tier c, matchIntent, #2075).
 *                         No parameterization, no composition, no writes, no
 *                         MCP-side validation.
 *
 * Deprecated aliases kept for one minor release (removal tracked as a follow-up):
 *   - rafters_component -> describe(<id>) via the overlay.
 *   - rafters_composite -> describe(<id>) by id; existing composite search otherwise.
 *   - rafters_pattern   -> existing composite search (NOT the intent door, whose
 *                          curated tags cannot answer most real queries yet).
 *
 * The graph is populated lazily, per workspace, on the first describe/generate
 * call that touches it (fetchAllItems + assembleGraph + buildFacetTargetIndex),
 * and cached by workspace root. Agents assemble from pre-made decisions. Token
 * design lives in Studio; token import lives in `rafters init` / `rafters import`.
 */

import type { Dirent } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  type CompositeFile,
  getAllComposites,
  getCompositesByCategory,
  registerComposite,
  searchComposites,
} from '@rafters/composites';
// node-fs adapter lives behind the server-only subpath (it imports node:fs).
import { discoverFromDirs } from '@rafters/composites/node';
import { z } from 'zod';
import { migrateConfig, type RaftersConfig } from '../config/rafters-config.js';
import { RegistryClient, registryClient } from '../registry/client.js';
import {
  type ComponentTarget,
  ComponentTargetSchema,
  type RegistryItem,
} from '../registry/types.js';
import {
  getRaftersPaths,
  type PathField,
  PathFieldSchema,
  resolveReadSet,
} from '../utils/paths.js';
import { resolveWorkspace, type Workspace } from '../utils/workspaces.js';
import { assembleGraph, describe, type Graph, type NodeResult } from './graph.js';
import { isNaturalLanguageQuery, matchIntent } from './intent.js';
import {
  describeWithOverlay,
  type InstalledSet,
  type OverlayContext,
  type Presence,
} from './overlay.js';

/**
 * True when a path is safe to accept from an agent: relative, and with no `..`
 * segment that would escape the workspace. Absolute paths and traversal are
 * rejected because these fields drive on-disk reads (composite discovery) and
 * writes for out-of-diff commands -- an agent-supplied path must stay inside the
 * workspace. Mirrors Studio's `validateFontsPath`.
 */
function isSafeRelPath(p: string): boolean {
  if (isAbsolute(p)) return false;
  return !p.split(/[/\\]/).includes('..');
}

/** Apply {@link isSafeRelPath} across a PathField (string or array of entries). */
const SafePathFieldSchema = PathFieldSchema.refine(
  (field) => {
    const entries = typeof field === 'string' ? [field] : field;
    return entries.every((e) => isSafeRelPath(typeof e === 'string' ? e : e.path));
  },
  { message: 'path must be relative and stay inside the workspace (no absolute or `..` paths)' },
);

/**
 * The config fields the MCP may write -- the WIRING, everything that is not a
 * designer decision. The three designer-owned fields (intent, darkMode, fonts)
 * belong to Studio; `installed` is managed by `rafters add`. Those are rejected
 * by updateWorkspaceConfig with a pointer to the right surface, so this write
 * path structurally cannot remove designer choice. Path and URL fields are
 * bounded (relative-in-workspace, http(s)) so an agent-driven write -- including
 * one steered by prompt injection -- cannot repoint reads/fetches out of bounds.
 */
const ConfigWiringSchema = z
  .object({
    // Closed set -- excludes 'unknown', which is a detection sentinel, not a
    // valid target a caller may set.
    framework: z.enum(['next', 'vite', 'remix', 'react-router', 'astro', 'wc', 'vanilla']),
    // Must be a valid http(s) URL. (Blocking private/link-local/metadata hosts
    // is tracked as a follow-up -- see the registryUrl SSRF issue.)
    registryUrl: z
      .string()
      .url()
      .refine((u) => /^https?:$/.test(new URL(u).protocol), {
        message: 'registryUrl must be an http(s) URL',
      }),
    // Closed set derived from the framework (see ComponentTarget in detect.ts).
    componentTarget: z.enum(['react', 'astro', 'vue', 'svelte', 'wc']),
    source: z.string().min(1),
    cssPath: z.union([z.string(), z.null()]).refine((v) => v === null || isSafeRelPath(v), {
      message: 'cssPath must be relative and stay inside the workspace',
    }),
    componentsPath: SafePathFieldSchema,
    primitivesPath: SafePathFieldSchema,
    compositesPath: SafePathFieldSchema,
    rulesPath: SafePathFieldSchema,
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

/**
 * Leading filler phrases `rafters_generate` strips before trying a direct
 * component-id lookup (tier (b) in handleGenerate). Longest-phrase-per-family
 * FIRST, so "i need a " strips before the shorter "i need " when both would
 * match a query like "i need a button" -- a SINGLE strip only, never iterative
 * peeling. This literal, closed list is normalization, not an alias table or an
 * NLP pass.
 */
const GENERATE_LEADING_FILLER = [
  'give me a ',
  'give me an ',
  'give me ',
  'i need a ',
  'i need an ',
  'i need ',
  'i want a ',
  'i want an ',
  'i want ',
  'create a ',
  'create an ',
  'create ',
  'make me a ',
  'make me an ',
  'make a ',
  'make an ',
  'make ',
  'a ',
  'an ',
  'the ',
] as const;

/**
 * Deterministic, LIGHT normalization of a generate() query into a candidate
 * lookup key: lowercase, trim, strip AT MOST ONE leading filler phrase (first
 * match in `GENERATE_LEADING_FILLER`'s order), then strip trailing punctuation.
 * NOT a fuzzy match -- the result is compared for exact string equality against
 * a real graph node id (`graph.nodes.get(candidate)`), nothing more. No alias
 * table: only the graph's own node ids are ever matched. The ORIGINAL `intent`
 * argument -- never this candidate -- is what gets passed to `matchIntent` (tier
 * (c)), so stripping never touches the intent door's own keyword matching.
 */
function normalizeGenerateQuery(intent: string): string {
  const lowered = intent.trim().toLowerCase();
  let candidate = lowered;
  for (const filler of GENERATE_LEADING_FILLER) {
    if (candidate.startsWith(filler)) {
      candidate = candidate.slice(filler.length);
      break;
    }
  }
  return candidate.trim().replace(/[.,!?]+$/, '');
}

/**
 * One open content slot in a rafters_generate response. `ownedBy`/`status` are
 * fixed literals (never inferred) -- generate never sources content, it only
 * reports which slots the returned snippet leaves for the caller to fill.
 */
interface GenerateSlot {
  slot: string;
  ownedBy: 'caller';
  status: 'open';
}

/**
 * rafters_generate's success payload: one resolved component's verbatim,
 * target-correct snippet plus its open content slots. Built by EXPLICIT FIELD
 * CONSTRUCTION -- never by spreading a graph.ts `NodeResult` -- so `intel`,
 * `children`, `parent`, `siblings` (describe's teaching payload) never leak into
 * generate's authority payload.
 */
interface GenerateResult {
  component: string;
  target: ComponentTarget;
  presence: Presence;
  snippet: string;
  slots: GenerateSlot[];
  /**
   * The command that makes the snippet usable, present ONLY when `presence` is
   * `available`. generate is the authority on the artifact, not a gatekeeper:
   * it always hands back the code, and when the component is not yet in the
   * workspace it says so and names the one command that fixes it.
   */
  install?: string;
}

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
    name: 'rafters_describe',
    description:
      'Recursively introspect the component/composite intel graph. describe() returns the ' +
      'installed surface; describe(components)/describe(composites) list the kind roster; ' +
      'describe(button) returns a node -- intel plus type-marked, drillable children; ' +
      'describe(button.props.fill) drills into a prop and returns the real token values. ' +
      'describe(button.*) expands all props inline in one call (no more drill-per-prop ' +
      'round trips); describe(button.props.fill.?) probes safely (null on miss, not an ' +
      'error). A natural-language address (e.g. "what do I use when it needs to be above ' +
      'everything") routes through a separate intent door instead: deterministic keyword ' +
      'matching over a small, curated tag axis, returning a best-match node plus its ' +
      'near-miss counter-example. Below its match threshold it refuses rather than guessing, ' +
      'with a note pointing you at describe(components)/describe(composites) to browse; ' +
      '#2166 (open) is the follow-up that scores it against the intel this tool already owns. ' +
      'A part node carries parent, plus siblings when its parent has other parts; children are ' +
      "typed pointers you feed back in (the prop's own type for props, part for sub-components, " +
      'edge for composesWith).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        address: {
          type: 'string',
          description: 'A dot-address ("button.props.variant") or a natural-language question.',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'rafters_generate',
    description:
      'Resolve a bare component name to ONE registry component and return its verbatim, ' +
      'target-correct snippet with open content slots. A component name (e.g. "button", ' +
      '"separator", "badge") resolves directly; on a miss it falls back to the same intent ' +
      'door rafters_describe uses -- deterministic keyword matching over a small, curated ' +
      'tag axis, refusing below its match threshold with a note pointing you at ' +
      'describe(components) rather than guessing (#2166, open, is the follow-up that scores ' +
      'it against the intel this tool already owns). Returns { component, target, presence, ' +
      'snippet, slots } where snippet is the registry facet verbatim and each slot is left ' +
      'for the caller to fill. READ `presence` BEFORE PASTING: `installed` means the import ' +
      'resolves in this workspace; `available` means the component exists in the registry but ' +
      'is NOT in this project yet -- the snippet is still correct, but you must run the ' +
      'command in `install` first or the build fails on a missing import. v1 serves single ' +
      'components only -- no parameterization, no composites, no writes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        intent: { type: 'string', description: 'A component name or a natural-language request' },
      },
      required: ['intent'],
    },
  },
  // Deprecated aliases -- kept for one minor release, then removed (tracked as a
  // follow-up). Input schemas unchanged; every response carries a `deprecated`
  // field pointing at rafters_describe.
  {
    name: 'rafters_composite',
    description:
      '[DEPRECATED -- use rafters_describe] Query composites by ID, search term, or category. ' +
      'Returns designer intent (solves, appliesWhen, do/never), I/O rules for chaining, and block structure.',
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
      '[DEPRECATED -- use rafters_describe] Get design pattern guidance by querying composites. ' +
      'Search by what the pattern solves (e.g., "authentication", "data entry", "navigation") to ' +
      'get do/never rules, cognitive load, and designer intent.',
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
      '[DEPRECATED -- use rafters_describe] Get component intelligence: cognitive load, ' +
      'accessibility, do/never guidance, variants, sizes.',
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

/** Stamped onto every deprecated-alias response. */
const DEPRECATED_MSG = 'use rafters_describe instead';

/**
 * The path fields `scanInstalled` resolves to find what is on disk. Validated
 * because `readConfig` is a raw `JSON.parse` -- an unvalidated `componentsPath`
 * reaches `resolveReadSet`, which calls `.map()` on it and throws on a number
 * or an object. Every field is optional: an absent path field falls back to the
 * framework default, and a workspace with no config at all is "nothing
 * installed", never a crash.
 */
const OverlayPathsSchema = z.object({
  componentsPath: PathFieldSchema.optional(),
  primitivesPath: PathFieldSchema.optional(),
  compositesPath: PathFieldSchema.optional(),
});

/**
 * overlayContext's failure case: the workspace's config.rafters.json exists and
 * parsed as JSON (readConfig returned non-null), but a path field it needs to
 * resolve is the wrong shape -- e.g. `componentsPath` is a number instead of a
 * string or entry array. `configError` names the config file path and the
 * offending field, the same recovery shape every other errorResult in this file
 * already carries. Distinct from "no config at all" (readConfig returns null;
 * overlayContext degrades to no-target/nothing-installed).
 */
interface OverlayConfigError {
  configError: string;
}

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
  /**
   * Per-workspace-root cache: the intel graph, built once, lazily, on the first
   * describe/generate call that touches that root. The graph is universal and
   * target-free (a node carries all its per-target facets); the workspace's
   * target is applied per query by the overlay, not baked into the cache. Same
   * per-workspace caching shape as `compositesLoadedFor`/`registryClients`. A
   * failed build is never inserted, so the next call retries rather than
   * permanently wedging that workspace.
   */
  private graphsByWorkspace = new Map<string, Graph>();
  /**
   * The whole-catalog item source `ensureGraph` builds from. Defaults to the
   * workspace's registry client `fetchAllItems()` (bulk endpoint with per-item
   * fallback). Injectable so the dispatch can be unit-tested against a fixture
   * catalog without a network round-trip.
   */
  private readonly itemsSource: (workspace: Workspace | null) => Promise<RegistryItem[]>;

  constructor(
    workspaces: Workspace[],
    defaultWorkspace: Workspace | null,
    itemsSource?: (workspace: Workspace | null) => Promise<RegistryItem[]>,
  ) {
    this.workspaces = workspaces;
    this.defaultWorkspace = defaultWorkspace;
    this.itemsSource =
      itemsSource ?? (async (ws) => (await this.registryClientFor(ws)).fetchAllItems());
  }

  async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    switch (name) {
      case 'rafters_workspaces':
        return this.handleWorkspaces(args);
      case 'rafters_describe':
        return this.handleDescribe(args.address as string, args.workspace as string | undefined);
      case 'rafters_generate':
        return this.handleGenerate(args.intent as string, args.workspace as string | undefined);
      case 'rafters_composite':
        return this.handleComposite(args);
      case 'rafters_pattern':
        return this.handlePattern(args as { solves?: string; query?: string; workspace?: string });
      case 'rafters_component':
        return this.handleComponent(args.name as string, args.workspace as string | undefined);
      default:
        return this.errorResult(`Unknown tool: ${name}`, {
          suggestion:
            'Available tools: rafters_workspaces, rafters_describe, rafters_generate. Deprecated: rafters_composite, rafters_pattern, rafters_component.',
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
    // `exports` is a partial patch -- merge it over the existing object rather
    // than replacing wholesale, matching the tool's "only fields you pass
    // change" contract (the top-level spread would drop the unlisted keys).
    if (result.data.exports !== undefined) {
      updated.exports = { ...config.exports, ...result.data.exports } as RaftersConfig['exports'];
    }

    try {
      await this.writeConfig(resolved.root, updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.errorResult(`failed to write config: ${message}`);
    }

    // NOTE: the written config takes effect for reads on the next MCP server
    // start. We deliberately do NOT hot-reload composites on a compositesPath
    // change here: the composite registry is process-global and first-write-
    // wins, so a mid-session reload would leave old-path composites registered
    // alongside new ones (inconsistent), and same-id composites in the new path
    // would silently fail to register. In the normal setup flow -- configure
    // paths, then read -- nothing is loaded yet, so this costs nothing.

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
   * Build (once, lazily) and cache the intel graph for a workspace root.
   * `assembleGraph` (#2072/#2090) consumes the whole-catalog `RegistryItem[]` and
   * carries each node's complete intelligence and all per-target facets onto the
   * universal graph. Throws when the catalog can't be loaded (both the bulk
   * endpoint and the per-item fallback failed) or the graph is structurally
   * broken (a dangling `composesWith` edge -- #2072's deliberate fail-fast); the
   * caller converts that into a structured error result. A failed build is never
   * cached, so the next call retries.
   */
  private async ensureGraph(workspace: Workspace | null): Promise<Graph> {
    const key = workspace?.root ?? '';
    const cached = this.graphsByWorkspace.get(key);
    if (cached) return cached;

    const graph = assembleGraph(await this.itemsSource(workspace));
    this.graphsByWorkspace.set(key, graph);
    return graph;
  }

  /**
   * Resolve a workspace's overlay context: the configured `componentTarget`
   * (echoed as-is, `undefined` in degraded mode) and its installed set. The
   * installed set is measured from disk via `scanInstalled`, not read off
   * `config.installed` -- see that method's header for why. Per the
   * integration note on #2074, a scanned primitive folds into the components
   * set (`scanInstalled` does this itself) -- a `primitive`-kind item maps to
   * graph kind `component`, so without the fold every installed primitive
   * would misreport as `available`.
   *
   * `componentTarget` comes off unvalidated on-disk config (`readConfig` is a raw
   * `JSON.parse`), so it is run through `ComponentTargetSchema` here rather than
   * trusted as a `ComponentTarget` -- a stale or typo'd value falls back to
   * degraded mode (`undefined` target) instead of silently forcing
   * `rendersForTarget` false for every node.
   */
  private async overlayContext(
    workspace: Workspace | null,
  ): Promise<OverlayContext | OverlayConfigError> {
    const config = workspace ? await this.readConfig(workspace.root) : null;

    // Validate BEFORE anything downstream touches a path field. `readConfig`
    // already returns null (not a throw) for a missing file or JSON that fails
    // to parse/migrate; this guard closes the OTHER gap -- config that parses
    // fine but has a wrong-shaped path field (e.g. `componentsPath` as a
    // number). The union return type is the guard all three call sites
    // inherit: skipping the `'configError' in ctx` narrowing fails to
    // typecheck, not just at runtime.
    const parsedPaths = OverlayPathsSchema.safeParse(config ?? {});
    if (!parsedPaths.success) {
      const issue = parsedPaths.error.issues[0];
      const field = issue && issue.path.length > 0 ? issue.path.join('.') : 'a path field';
      const configPath = workspace ? getRaftersPaths(workspace.root).config : 'config.rafters.json';
      return {
        configError: `malformed config at ${configPath}: ${field} ${issue?.message ?? 'is invalid'}`,
      };
    }

    const parsedTarget = ComponentTargetSchema.safeParse(config?.componentTarget);
    return {
      target: parsedTarget.success ? parsedTarget.data : undefined,
      installed: workspace
        ? await this.scanInstalled(workspace.root, parsedPaths.data)
        : { components: new Set(), composites: new Set() },
    };
  }

  /**
   * The component and composite ids actually present on disk in a workspace.
   *
   * DISK IS THE TRUTH, not `config.installed`. That field is a record `rafters
   * add` maintains, and a record drifts from the thing it records in both
   * directions: a part pulled in as a dependency (card-action) never appears in
   * it, and an entry survives a manual delete. Presence is the JOIN between the
   * public catalog and this project, so it has to be MEASURED, not remembered.
   *
   * An id is the basename before the first dot, so every file a component ships
   * (`input.tsx`, `input.behavior.ts`, `input.classes.ts`) maps to one id and
   * any single one of them proves the component is there. Target-agnostic by
   * construction -- no extension table to keep in sync as targets are added.
   *
   * NOT CACHED, deliberately. This is a readdir; the catalog behind it is a
   * network fetch plus a graph build. Caching the cheap half is exactly what
   * would make `rafters add` invisible until an MCP restart -- re-reading it per
   * query means the next call simply sees the new file, with no invalidation,
   * no IPC, and no watcher. `add` writes a file; the file IS the message.
   */
  private async scanInstalled(
    workspaceRoot: string,
    paths: z.infer<typeof OverlayPathsSchema>,
  ): Promise<InstalledSet> {
    const idsUnder = async (
      field: PathField | undefined,
      fallback: string,
    ): Promise<Set<string>> => {
      const roots = field ? resolveReadSet(field, workspaceRoot) : [join(workspaceRoot, fallback)];
      const ids = new Set<string>();
      for (const root of roots) {
        let entries: Dirent[];
        try {
          entries = await readdir(root, { withFileTypes: true });
        } catch {
          // An absent folder is "nothing installed here", never an error: a
          // project legitimately has no composites dir until it has composites.
          continue;
        }
        for (const entry of entries) {
          if (!entry.isFile() || entry.name.startsWith('.')) continue;
          const id = entry.name.split('.')[0];
          if (id) ids.add(id);
        }
      }
      return ids;
    };

    // Primitives fold into components: a `primitive`-kind registry item maps to
    // graph kind `component`, so without the fold every installed primitive
    // would misreport as `available`.
    const components = await idsUnder(paths.componentsPath, 'components/ui');
    for (const id of await idsUnder(paths.primitivesPath, 'lib/primitives')) {
      components.add(id);
    }

    return {
      components,
      composites: await idsUnder(paths.compositesPath, join('.rafters', 'composites')),
    };
  }

  /**
   * The `rafters_describe` dispatcher -- the one seam that composes #2072/#2074/
   * #2075. A natural-language question routes through the intent door
   * (`matchIntent`); a dot-address resolves through the workspace overlay
   * (`describeWithOverlay`, which delegates to #2072's `describe`).
   */
  private async handleDescribe(address: string, workspaceName?: string): Promise<CallToolResult> {
    const resolved = this.resolve(workspaceName);
    if (workspaceName && !resolved) {
      return this.workspaceRequiredError();
    }

    let graph: Graph;
    try {
      graph = await this.ensureGraph(resolved);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.errorResult(`failed to build intel graph: ${message}`);
    }

    if (isNaturalLanguageQuery(address)) {
      return this.jsonResult(matchIntent(address, graph));
    }
    const ctx = await this.overlayContext(resolved);
    if ('configError' in ctx) {
      return this.errorResult(ctx.configError);
    }
    return this.jsonResult(describeWithOverlay(address, graph, ctx));
  }

  /**
   * The `rafters_generate` handler. A prose query resolves -- first through a
   * light, deterministic direct-name lookup (tier b), then through the existing
   * intent door (tier c) -- to a single registry component, and the tool returns
   * that component's authoritative, target-correct snippet verbatim with its
   * content slots marked open for the caller. Both tiers re-resolve the winning
   * id through `describe(id, graph, ctx.target)`, so the response always carries
   * the workspace target's facet, never the intent door's untargeted fields.
   * v1 serves components only: composites, parameterization, composition,
   * writes, and MCP-side validation are all out of scope.
   */
  private async handleGenerate(intent: string, workspaceName?: string): Promise<CallToolResult> {
    const resolved = this.resolve(workspaceName);
    if (workspaceName && !resolved) {
      return this.workspaceRequiredError();
    }

    let graph: Graph;
    try {
      graph = await this.ensureGraph(resolved);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.errorResult(`failed to build intel graph: ${message}`);
    }

    const ctx = await this.overlayContext(resolved);
    if ('configError' in ctx) {
      return this.errorResult(ctx.configError);
    }

    // Tier (b): direct component-id lookup, BEFORE the intent door. Exact string
    // equality only, against the same `graph.nodes` map `describe` itself
    // indexes -- no fuzzy/substring search, no alias table.
    const candidate = normalizeGenerateQuery(intent);
    const directHit = graph.nodes.get(candidate);
    let nodeId: string | undefined;
    let noMatchNote: string | undefined;
    if (directHit && directHit.kind === 'component') {
      nodeId = candidate;
    } else {
      // Tier (c): fall back to the EXISTING intent door, called with the
      // ORIGINAL, unmodified `intent` string -- never the normalized candidate.
      const match = matchIntent(intent, graph);
      if ('use' in match) {
        nodeId = match.use.id;
      } else {
        noMatchNote = match.note;
      }
    }

    // Tier (d): both tiers missed -- the flat refusal, carrying the intent
    // door's note (when the door ran) so the description's "with a note
    // pointing you at describe(components)" claim is actually true here too.
    if (nodeId === undefined) {
      return this.errorResult(
        'no registry component matches this query',
        noMatchNote === undefined ? undefined : { note: noMatchNote },
      );
    }

    // One `describe` call resolves the winning id through the workspace's target
    // lens. Narrow with the same pattern intent.ts uses; `nodeId` was already
    // validated as a real graph node, so this branch is always taken in
    // practice -- the guard exists so the code is honestly typed.
    const result = describe(nodeId, graph, ctx.target);
    if (result === null || Array.isArray(result) || !('children' in result)) {
      return this.errorResult('no registry component matches this query');
    }
    const node: NodeResult = result;

    // v1 serves components only (composites are explicitly out of scope).
    // Reachable via tier (c) only: a composite id typed directly never becomes a
    // tier-(b) nodeId (the kind check excludes it), so it ends at tier (d)'s
    // generic refusal instead of this named one.
    if (node.kind !== 'component') {
      return this.errorResult(
        `${node.id} resolved, but is a composite -- rafters_generate v1 returns single components only`,
      );
    }

    // Branch the ERROR MESSAGE on whether a target is configured at all; branch
    // the CHECK on `node.snippet === undefined` (layer0 only sets `snippet` when
    // a facet resolved for `target`, and FacetSchema.snippet is required, so this
    // one check covers both "no target configured" and "target configured but no
    // facet for it"). The graph never guesses a target.
    if (ctx.target === undefined) {
      return this.errorResult(
        `${node.id} resolved, but no componentTarget is configured for this workspace -- generate cannot choose a snippet without one`,
      );
    }
    if (node.snippet === undefined) {
      return this.errorResult(
        `${node.id} resolved, but has no ${ctx.target} facet -- nothing to generate for this target`,
      );
    }

    // Success: verbatim snippet, no synthesis, no quality check. Every
    // facet.slots entry becomes one open marker, in order.
    //
    // `presence` rides on EVERY response, never only the bad case. A payload
    // that carries the field sometimes teaches the caller to read it never;
    // the agent pasting this has no other way to know whether the import it is
    // about to write resolves. Sourced from the same installed set the overlay
    // stamps describe with, so the two tools cannot disagree about one
    // workspace.
    const presence: Presence = ctx.installed.components.has(node.id) ? 'installed' : 'available';

    return this.jsonResult({
      component: node.id,
      target: ctx.target,
      presence,
      snippet: node.snippet,
      slots: (node.slots ?? []).map((slot) => ({
        slot,
        ownedBy: 'caller' as const,
        status: 'open' as const,
      })),
      // Spread rather than assign: `exactOptionalPropertyTypes` distinguishes
      // an absent key from an explicit `undefined`, and an installed component
      // has no install step to name.
      ...(presence === 'available' ? { install: `rafters add ${node.id}` } : {}),
    } satisfies GenerateResult);
  }

  /**
   * Stamp the deprecated marker as a top-level field. Objects gain a sibling
   * `deprecated` key; the rare array/leaf result is wrapped so the marker still
   * rides at top level.
   */
  private withDeprecated(payload: unknown): Record<string, unknown> {
    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      return { ...(payload as Record<string, unknown>), deprecated: DEPRECATED_MSG };
    }
    return { result: payload, deprecated: DEPRECATED_MSG };
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

    // By-id forwards to describe (via the overlay) -- there is no `'composites.'
    // + id` address form in #2072, so a single id resolves the same node either
    // kind. Free-text/category search keeps the existing composite-registry body
    // below (the intent door's curated tags cannot answer most real queries yet).
    if (id) {
      return this.describeById(id, workspace);
    }

    const resolved = this.resolve(workspace);
    if (workspace && !resolved) {
      return this.workspaceRequiredError();
    }

    await this.ensureCompositesLoaded(resolved);

    let composites: CompositeFile[];

    if (query) {
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

    return this.jsonResult({ composites: result, deprecated: DEPRECATED_MSG });
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

      return this.errorResult('No patterns found matching query', {
        available,
        deprecated: DEPRECATED_MSG,
      });
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

    return this.jsonResult({ patterns, deprecated: DEPRECATED_MSG });
  }

  /**
   * DEPRECATED alias for `rafters_describe`. A component resolves by id through
   * the overlay exactly as `describe(<id>)` does (#2072's resolver has no
   * separate component/composite address form -- `describe(<id>)` resolves either
   * kind), so this is a direct, lossless forward with the deprecated marker added.
   */
  private async handleComponent(
    componentName: string,
    workspaceName?: string,
  ): Promise<CallToolResult> {
    return this.describeById(componentName, workspaceName);
  }

  /**
   * Shared by the deprecated `rafters_component` and `rafters_composite({id})`
   * paths: resolve one id through the overlay, stamp the deprecated marker.
   */
  private async describeById(id: string, workspaceName?: string): Promise<CallToolResult> {
    const resolved = this.resolve(workspaceName);
    if (workspaceName && !resolved) {
      return this.workspaceRequiredError();
    }

    let graph: Graph;
    try {
      graph = await this.ensureGraph(resolved);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return this.errorResult(`failed to build intel graph: ${message}`, {
        deprecated: DEPRECATED_MSG,
      });
    }

    const ctx = await this.overlayContext(resolved);
    if ('configError' in ctx) {
      return this.errorResult(ctx.configError, { deprecated: DEPRECATED_MSG });
    }
    const out = describeWithOverlay(id, graph, ctx);
    return this.jsonResult(this.withDeprecated(out));
  }
}
