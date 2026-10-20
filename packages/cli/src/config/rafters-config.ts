/**
 * Leaf config module: the `.rafters/config.rafters.json` shape and its legacy
 * migration, with no dependency on `@rafters/design-tokens` (whose `css-tree`
 * transitive dep loads JSON data files via a module-scope `createRequire` that
 * cannot be inlined into a single-file bundle). Extracted out of
 * `commands/init.ts` so the MCP plugin bundle (`src/plugin-entry.ts`) can reach
 * `RaftersConfig`/`migrateConfig` through `mcp/tools.ts` without dragging the
 * design-tokens import edge into the bundle.
 */

import { BlockList, isIP } from 'node:net';
import { type ComponentTarget, ComponentTargetSchema } from '../registry/types.js';
import type { Framework } from '../utils/detect.js';
import type { ExportConfig } from '../utils/exports.js';
import type { PathField } from '../utils/paths.js';

export interface FontsConfig {
  path?: string | null;
  imports?: string[];
  /** ISO 15924 script codes the project supports, e.g. ['Latn', 'Arab']. Absent = DEFAULT_SCRIPTS. */
  scripts?: string[];
}

export interface RaftersConfig {
  framework: Framework;
  /** Registry to install from / query. Set this to host your own internal registry. */
  registryUrl?: string;
  componentTarget?: ComponentTarget;
  componentsPath: PathField;
  primitivesPath: PathField;
  compositesPath: PathField;
  rulesPath: PathField;
  cssPath: string | null;
  /** Which design system this project was imported from. Replaces the old `shadcn` boolean. */
  source?: string;
  exports: ExportConfig;
  darkMode?: 'class' | 'media';
  /** Aesthetic starting point and rollback target. Default "efficient". */
  intent?: string;
  /** Font file locations and web font imports. */
  fonts?: FontsConfig;
  installed?: {
    components: string[];
    primitives: string[];
    composites: string[];
    rules: string[];
    substrate?: string[];
  };
}

/**
 * Migrate legacy configs that carry `shadcn: boolean` to the new `source`
 * field. Called on every config read so existing projects upgrade silently.
 */
export function migrateConfig(raw: Record<string, unknown>): Record<string, unknown> {
  if ('shadcn' in raw && !('source' in raw)) {
    if (raw.shadcn === true) {
      raw.source = 'shadcn';
    }
    delete raw.shadcn;
  }
  return raw;
}

/**
 * A config whose `componentTarget` is not one of `ComponentTargetSchema`'s
 * targets. Raised instead of falling back to React, so a project still pointed
 * at the removed Web Component target learns why nothing installs for it.
 */
export class UnsupportedComponentTargetError extends Error {
  constructor(value: unknown, configPath: string) {
    super(
      `componentTarget ${JSON.stringify(value)} in ${configPath} is not supported: the Web Component target (wc) was removed. Supported targets: ${ComponentTargetSchema.options.join(', ')}.`,
    );
    this.name = 'UnsupportedComponentTargetError';
  }
}

/**
 * Loopback, RFC1918, link-local (which holds the 169.254.169.254 cloud metadata
 * address) and their IPv4-mapped IPv6 forms, which `BlockList` checks against
 * the IPv4 rules.
 */
const BLOCKED_REGISTRY_RANGES = new BlockList();
BLOCKED_REGISTRY_RANGES.addSubnet('127.0.0.0', 8, 'ipv4');
BLOCKED_REGISTRY_RANGES.addSubnet('10.0.0.0', 8, 'ipv4');
BLOCKED_REGISTRY_RANGES.addSubnet('172.16.0.0', 12, 'ipv4');
BLOCKED_REGISTRY_RANGES.addSubnet('192.168.0.0', 16, 'ipv4');
BLOCKED_REGISTRY_RANGES.addSubnet('169.254.0.0', 16, 'ipv4');
BLOCKED_REGISTRY_RANGES.addAddress('::1', 'ipv6');
BLOCKED_REGISTRY_RANGES.addSubnet('fe80::', 10, 'ipv6');

/**
 * Whether a `registryUrl` names a host an agent-driven write must not point the
 * registry client at: localhost, `*.localhost`, or an address literal in a
 * blocked range. The host is read from the WHATWG-parsed URL, so encodings such
 * as `http://2130706433/` are judged as the address they normalize to. A DNS
 * name that resolves to a private address is not caught. An unparseable URL is
 * blocked.
 */
export function isBlockedRegistryHost(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return true;
  }
  const host = hostname.replace(/^\[(.*)\]$/, '$1').replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  const family = isIP(host);
  if (family === 0) return false;
  return BLOCKED_REGISTRY_RANGES.check(host, family === 4 ? 'ipv4' : 'ipv6');
}
