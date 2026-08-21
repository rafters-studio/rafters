/**
 * Leaf config module: the `.rafters/config.rafters.json` shape and its legacy
 * migration, with no dependency on `@rafters/design-tokens` (whose `css-tree`
 * transitive dep loads JSON data files via a module-scope `createRequire` that
 * cannot be inlined into a single-file bundle). Extracted out of
 * `commands/init.ts` so the MCP plugin bundle (`src/plugin-entry.ts`) can reach
 * `RaftersConfig`/`migrateConfig` through `mcp/tools.ts` without dragging the
 * design-tokens import edge into the bundle.
 */

import type { ComponentTarget } from '../registry/types.js';
import type { Framework } from '../utils/detect.js';
import type { ExportConfig } from '../utils/exports.js';
import type { PathField } from '../utils/paths.js';

export interface FontsConfig {
  path?: string | null;
  imports?: string[];
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
