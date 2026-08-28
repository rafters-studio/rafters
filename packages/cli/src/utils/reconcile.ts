/**
 * Update reconciliation
 *
 * `--update-all` used to take its candidate list from `config.installed` alone.
 * A component sitting on disk that the config never recorded -- a pre-tracking
 * install, a hand-copied file, a config reset, a dependency installed before
 * dependency tracking existed -- was invisible to every future update, forever:
 * no code path discovered it, so the tree silently drifted while the CLI
 * reported success.
 *
 * Reconciliation closes that hole by asking the registry index what exists and
 * then asking the disk which of those names are present. The scan runs
 * index-first (not filename-first) deliberately: consumer-authored files in the
 * same folders never masquerade as registry items, and there is no suffix list
 * to keep in sync with the registry's served file shapes.
 */

import { readdirSync } from 'node:fs';
import type { RaftersConfig } from '../commands/init.js';
import { type PathField, resolveReadSet } from './paths.js';

/**
 * The item kinds `--update-all` can rediscover from disk. Substrate and rules
 * are deliberately excluded: substrate installs through `substrateProjectPath`
 * (under the source root, in per-kind dirs) rather than a configured path
 * field, so discovering it needs a different scan than this one.
 */
export const DISCOVERABLE_KINDS = ['components', 'primitives', 'composites'] as const;

export type DiscoverableKind = (typeof DISCOVERABLE_KINDS)[number];

/** The subset of the registry index reconciliation reads. */
export type DiscoveryIndex = Record<DiscoverableKind, string[]>;

/** Bare directory entry names found under each kind's configured roots. */
export type DirEntries = Record<DiscoverableKind, string[]>;

/**
 * Config path field and default folder for each discoverable kind. Exported so
 * other on-disk scans (the MCP server's presence scan in mcp/tools.ts) resolve
 * the same fallback a project gets from `rafters init` (`FRAMEWORK_SPECS.next`),
 * instead of re-declaring their own copy that can drift from it.
 */
export const KIND_PATHS: Record<
  DiscoverableKind,
  { field: keyof RaftersConfig; fallback: string }
> = {
  components: { field: 'componentsPath', fallback: 'components/ui' },
  primitives: { field: 'primitivesPath', fallback: 'lib/primitives' },
  composites: { field: 'compositesPath', fallback: 'composites' },
};

/**
 * Does a directory listing contain a file belonging to `name`?
 *
 * Registry items install flat: `button.tsx`, `button.behavior.ts`,
 * `hero.composite.json`, `classy.ts`. Matching on `name` or `name.` (never a
 * bare prefix) keeps `grid` from claiming `grid-item.tsx`.
 */
export function hasEntryFor(entries: string[], name: string): boolean {
  return entries.some((entry) => entry === name || entry.startsWith(`${name}.`));
}

/**
 * Split the `--update-all` candidate set into what the config already tracks
 * and what only the disk knows about. Pure -- callers supply the index and the
 * directory listings.
 *
 * A null index (registry unreachable, self-hosted registry without an index)
 * yields no discoveries rather than an error: updating the tracked set is still
 * strictly better than refusing to run.
 */
export function buildUpdateCandidates(
  tracked: string[],
  index: DiscoveryIndex | null,
  entries: DirEntries,
): { tracked: string[]; untracked: string[] } {
  const trackedSet = new Set(tracked);
  const untracked = new Set<string>();

  if (index) {
    for (const kind of DISCOVERABLE_KINDS) {
      for (const name of index[kind]) {
        if (trackedSet.has(name)) continue;
        if (hasEntryFor(entries[kind], name)) untracked.add(name);
      }
    }
  }

  return { tracked: [...trackedSet].sort(), untracked: [...untracked].sort() };
}

/**
 * Read the entry names under every configured root for each discoverable kind.
 * Uses the full read set (not just the install root) so a project that reads
 * components from several folders is reconciled across all of them. Missing or
 * unreadable directories contribute nothing.
 */
export function readInstallRoots(cwd: string, config: RaftersConfig | null): DirEntries {
  const entries: DirEntries = { components: [], primitives: [], composites: [] };

  for (const kind of DISCOVERABLE_KINDS) {
    const { field, fallback } = KIND_PATHS[kind];
    const configured = config?.[field];
    const pathField: PathField = isPathField(configured) ? configured : fallback;
    const names = new Set<string>();
    for (const dir of resolveReadSet(pathField, cwd, fallback)) {
      try {
        for (const entry of readdirSync(dir)) names.add(entry);
      } catch {
        // Folder absent or unreadable -- nothing to reconcile there.
      }
    }
    entries[kind] = [...names];
  }

  return entries;
}

/** Narrow an unknown config value to a path field (string or entry array). */
function isPathField(value: unknown): value is PathField {
  return typeof value === 'string' || Array.isArray(value);
}
