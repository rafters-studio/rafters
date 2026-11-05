/**
 * Workspace discovery for monorepo support.
 *
 * The MCP server can be started from a monorepo root that contains multiple
 * workspaces, each with its own `.rafters/config.rafters.json`. The agent
 * picks one workspace per tool call via the `workspace` parameter.
 *
 * Discovery order:
 *   1. Walk up from `startDir` looking for `pnpm-workspace.yaml` or
 *      `package.json` with a `workspaces` field. That directory is the
 *      monorepo root.
 *   2. If found, expand workspace globs and filter to those containing
 *      `.rafters/config.rafters.json`.
 *   3. If not found, fall back to single-root mode -- walk up looking for
 *      `.rafters/config.rafters.json` and return that as a single-element list.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { discoverProjectRoot } from './discover.js';

export interface Workspace {
  /** Directory name -- agent uses this to scope tool calls. */
  name: string;
  /** Absolute path to the workspace root. */
  root: string;
}

interface MonorepoLayout {
  /** Absolute path to the monorepo root. */
  root: string;
  /** Workspace glob patterns from pnpm-workspace.yaml or package.json. */
  patterns: string[];
}

/**
 * Walk up from startDir to find a monorepo root.
 * Returns null if no pnpm-workspace.yaml or package.json#workspaces is found.
 *
 * If `boundary` is provided, the walk stops once it reaches that directory
 * (used by tests so they can isolate from the surrounding repo).
 */
function findMonorepoRoot(startDir: string, boundary?: string): MonorepoLayout | null {
  let current = resolve(startDir);
  const stopAt = boundary ? resolve(boundary) : null;

  for (;;) {
    const pnpmWorkspace = join(current, 'pnpm-workspace.yaml');
    if (existsSync(pnpmWorkspace)) {
      const patterns = parsePnpmWorkspaceYaml(readFileSync(pnpmWorkspace, 'utf-8'));
      if (patterns.length > 0) {
        return { root: current, patterns };
      }
    }

    const pkgJson = join(current, 'package.json');
    if (existsSync(pkgJson)) {
      const patterns = parsePackageJsonWorkspaces(readFileSync(pkgJson, 'utf-8'));
      if (patterns.length > 0) {
        return { root: current, patterns };
      }
    }

    if (stopAt && current === stopAt) return null;

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * Parse the `packages:` array from pnpm-workspace.yaml.
 * Minimal YAML parser sufficient for the standard pnpm-workspace shape.
 */
function parsePnpmWorkspaceYaml(content: string): string[] {
  const lines = content.split('\n');
  const patterns: string[] = [];
  let inPackages = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;

    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }

    if (inPackages) {
      const itemMatch = line.match(/^\s*-\s*(?:["']?)([^"'\s]+)(?:["']?)\s*$/);
      if (itemMatch?.[1]) {
        patterns.push(itemMatch[1]);
        continue;
      }
      // A non-list, non-empty line at column 0 ends the packages block.
      if (!/^\s/.test(line)) {
        inPackages = false;
      }
    }
  }

  return patterns;
}

/**
 * Parse the `workspaces` field from package.json (npm/yarn/bun shape).
 * Accepts both `workspaces: ["..."]` and `workspaces: { packages: ["..."] }`.
 */
function parsePackageJsonWorkspaces(content: string): string[] {
  try {
    const pkg = JSON.parse(content);
    const ws = pkg.workspaces;
    if (Array.isArray(ws)) {
      return ws.filter((p): p is string => typeof p === 'string');
    }
    if (ws && typeof ws === 'object' && Array.isArray(ws.packages)) {
      return ws.packages.filter((p: unknown): p is string => typeof p === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Expand a workspace glob pattern (only the trailing `*` form is supported,
 * matching the patterns pnpm and npm actually accept in practice).
 *
 * Supported:
 *   - `apps/*`        -> every direct subdirectory of `apps/`
 *   - `sites/*`       -> every direct subdirectory of `sites/`
 *   - `packages/cli`  -> the literal directory
 *
 * Not supported (would require a real glob library):
 *   - `**`, `{a,b}`, character classes, etc.
 */
function expandPattern(monorepoRoot: string, pattern: string): string[] {
  const trimmed = pattern.replace(/\/+$/, '');

  if (trimmed.endsWith('/*')) {
    const parentRel = trimmed.slice(0, -2);
    const parent = join(monorepoRoot, parentRel);
    if (!existsSync(parent)) return [];
    return readdirSync(parent)
      .map((entry) => join(parent, entry))
      .filter((path) => {
        try {
          return statSync(path).isDirectory();
        } catch {
          return false;
        }
      });
  }

  const literal = join(monorepoRoot, trimmed);
  if (existsSync(literal)) {
    try {
      if (statSync(literal).isDirectory()) return [literal];
    } catch {
      return [];
    }
  }
  return [];
}

export interface DiscoverOptions {
  /**
   * Stop the walk-up search at this directory (inclusive). When `discoverWorkspaces`
   * is called inside a wider monorepo (the rafters repo itself, the test
   * sandbox), `boundary` keeps discovery scoped to the intended subtree.
   */
  boundary?: string;
}

/**
 * Discover all workspaces with a `.rafters/config.rafters.json`.
 *
 * If `startDir` is inside a monorepo, returns every workspace package that
 * has been initialised with rafters. If not in a monorepo, returns at most
 * one workspace (the nearest ancestor with `.rafters/`).
 */
export function discoverWorkspaces(
  startDir: string = process.cwd(),
  options: DiscoverOptions = {},
): Workspace[] {
  const layout = findMonorepoRoot(startDir, options.boundary);

  if (!layout) {
    const single = discoverProjectRoot(startDir);
    if (!single) return [];
    if (options.boundary && !single.startsWith(resolve(options.boundary))) return [];
    return [{ name: basename(single), root: single }];
  }

  const seen = new Set<string>();
  const workspaces: Workspace[] = [];

  for (const pattern of layout.patterns) {
    for (const dir of expandPattern(layout.root, pattern)) {
      if (seen.has(dir)) continue;
      seen.add(dir);
      const config = join(dir, '.rafters', 'config.rafters.json');
      if (existsSync(config)) {
        workspaces.push({ name: basename(dir), root: dir });
      }
    }
  }

  // Some setups also keep a `.rafters/` at the monorepo root itself
  // (shared system used by every workspace). Include it if present and
  // not already covered by a pattern.
  const rootConfig = join(layout.root, '.rafters', 'config.rafters.json');
  if (existsSync(rootConfig) && !seen.has(layout.root)) {
    workspaces.unshift({ name: basename(layout.root), root: layout.root });
  }

  return workspaces;
}

/**
 * Pick the default workspace for an MCP session started in `startDir`.
 *
 * Rules:
 *   - If `startDir` is inside one of the discovered workspaces, that one wins.
 *   - Otherwise, if there is exactly one workspace, use it.
 *   - Otherwise, no default (caller must require a `workspace` parameter).
 */
export function pickDefaultWorkspace(
  workspaces: Workspace[],
  startDir: string = process.cwd(),
): Workspace | null {
  if (workspaces.length === 0) return null;

  const cwd = resolve(startDir);
  const containing = workspaces.find((ws) => cwd === ws.root || cwd.startsWith(`${ws.root}/`));
  if (containing) return containing;

  if (workspaces.length === 1) return workspaces[0] ?? null;
  return null;
}

/**
 * Resolve a workspace name to its root, or fall back to the default.
 * Returns null when no workspace is named and no default is set.
 *
 * An absolute path names the project that holds it, whether or not the session
 * discovered it. The server's cwd is fixed when it starts, so this is how an agent
 * that has moved into a clone or worktree says which project it is working in.
 */
export function resolveWorkspace(
  workspaces: Workspace[],
  defaultWorkspace: Workspace | null,
  name: string | undefined,
): Workspace | null {
  if (name && isAbsolute(name)) {
    const root = discoverProjectRoot(name);
    return root ? { name: basename(root), root } : null;
  }
  if (name) {
    return workspaces.find((ws) => ws.name === name) ?? null;
  }
  return defaultWorkspace;
}
