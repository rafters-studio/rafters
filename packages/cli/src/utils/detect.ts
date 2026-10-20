/**
 * Project detection
 *
 * One pass over the project's source files (`package.json`, `components.json`,
 * the framework's candidate CSS locations) returning everything callers need.
 * Public surface is a single `detectProject(cwd)` function -- no parallel
 * per-fact detectors that re-open the same files.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

export type Framework =
  | 'next'
  | 'vite'
  | 'remix'
  | 'react-router'
  | 'astro'
  | 'preact'
  | 'vanilla'
  | 'unknown';

/** Frameworks a user can pick with `--framework` or via the interactive prompt. */
export const SELECTABLE_FRAMEWORKS: ReadonlyArray<Exclude<Framework, 'unknown'>> = [
  'next',
  'vite',
  'remix',
  'react-router',
  'astro',
  'preact',
  'vanilla',
];

export function isSelectableFramework(value: string): value is Exclude<Framework, 'unknown'> {
  return (SELECTABLE_FRAMEWORKS as ReadonlyArray<string>).includes(value);
}

export const ShadcnConfigSchema = z
  .object({
    tailwind: z.object({ css: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();
export type ShadcnConfig = z.infer<typeof ShadcnConfigSchema>;

export interface ProjectDetection {
  readonly framework: Framework;
  readonly tailwindVersion: string | null;
  readonly shadcn: ShadcnConfig | null;
  /** `@astrojs/react` present in the project's deps -- decoupled from framework. */
  readonly astroHasReact: boolean;
  /**
   * First existing file under `FRAMEWORK_SPECS[framework].cssLocations`, or
   * null. Computed against the auto-detected `framework`. If a caller
   * overrides the framework (e.g. `--framework` flag), it must re-walk via
   * `findCssPath(cwd, resolved)` -- this field is not re-derived.
   */
  readonly cssPath: string | null;
}

const PackageJsonSchema = z
  .object({
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

const CONFIG_FILE_FRAMEWORKS: Array<{ files: string[]; framework: Framework }> = [
  { files: ['astro.config.mjs', 'astro.config.ts', 'astro.config.js'], framework: 'astro' },
  { files: ['next.config.mjs', 'next.config.ts', 'next.config.js'], framework: 'next' },
  { files: ['remix.config.js', 'remix.config.ts'], framework: 'remix' },
  { files: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'], framework: 'vite' },
];

/**
 * Read + Zod-validate a JSON file at `path`. Returns `null` when the file is
 * genuinely absent (ENOENT). All other failures (malformed JSON, schema
 * mismatch, permission errors) propagate -- this is a CLI, callers must see
 * them.
 */
async function readJsonIfExists<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  let content: string;
  try {
    content = await readFile(path, 'utf-8');
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') return null;
    throw err;
  }
  return schema.parse(JSON.parse(content));
}

function frameworkFromDeps(deps: Record<string, string>): Framework {
  if (deps.next) return 'next';
  // React Router v7 ships the `react-router` package; check before Remix.
  if (deps['react-router']) return 'react-router';
  if (Object.keys(deps).some((d) => d.startsWith('@remix-run/'))) return 'remix';
  if (deps.astro) return 'astro';
  // Preact without React, including Vite + Preact, so it precedes `vite`.
  if (deps.preact && !deps.react) return 'preact';
  if (deps.vite) return 'vite';
  return 'unknown';
}

function frameworkFromConfigFiles(cwd: string): Framework {
  for (const { files, framework } of CONFIG_FILE_FRAMEWORKS) {
    for (const file of files) {
      if (existsSync(join(cwd, file))) return framework;
    }
  }
  return 'unknown';
}

function extractTailwindVersion(deps: Record<string, string>): string | null {
  const raw = deps.tailwindcss;
  if (!raw) return null;
  const match = raw.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : raw;
}

/**
 * First existing file under `FRAMEWORK_SPECS[framework].cssLocations`, or null.
 * Pure table walk -- no project-file reads. Used by `detectProject` for the
 * auto-detected framework and by init when the resolved framework differs.
 */
export function findCssPath(cwd: string, framework: Framework): string | null {
  for (const location of FRAMEWORK_SPECS[framework].cssLocations) {
    if (existsSync(join(cwd, location))) return location;
  }
  return null;
}

export async function detectProject(cwd: string): Promise<ProjectDetection> {
  const pkg = await readJsonIfExists(join(cwd, 'package.json'), PackageJsonSchema);
  const deps: Record<string, string> = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {};
  const fromDeps = frameworkFromDeps(deps);
  const framework = fromDeps !== 'unknown' ? fromDeps : frameworkFromConfigFiles(cwd);
  const shadcn = await readJsonIfExists(join(cwd, 'components.json'), ShadcnConfigSchema);

  return {
    framework,
    tailwindVersion: extractTailwindVersion(deps),
    shadcn,
    astroHasReact: Boolean(deps['@astrojs/react']),
    cssPath: findCssPath(cwd, framework),
  };
}

export function isTailwindV3(version: string | null): boolean {
  if (!version) return false;
  return version.startsWith('3.');
}

/**
 * Component target derived from framework.
 * Determines which file extension to prefer when installing components.
 */
export type ComponentTarget = 'react' | 'astro' | 'vue' | 'svelte';

/**
 * Map a framework to its default component target.
 * All React-based frameworks (next, vite, remix, react-router) map to 'react'.
 * `preact` gets the React files too: they run through preact/compat.
 * `vanilla` defaults to 'react' since the React file is the shadcn drop-in
 * form most plain-TS projects still use.
 */
export function frameworkToTarget(framework: Framework): ComponentTarget {
  if (framework === 'astro') return 'astro';
  return 'react';
}

/**
 * All supported component file extensions, derived from ComponentTarget values.
 */
export const COMPONENT_EXTENSIONS = ['.tsx', '.astro', '.vue', '.svelte'] as const;

/**
 * Map a component target to its preferred file extension.
 */
export function targetToExtension(target: ComponentTarget): string {
  const map: Record<ComponentTarget, string> = {
    react: '.tsx',
    astro: '.astro',
    vue: '.vue',
    svelte: '.svelte',
  };
  return map[target];
}

/**
 * Resolve the component target from a config, falling back to framework detection.
 */
export function resolveComponentTarget(
  config: { componentTarget?: ComponentTarget; framework?: Framework } | null,
): ComponentTarget {
  if (config?.componentTarget) return config.componentTarget;
  if (config?.framework) return frameworkToTarget(config.framework);
  return 'react';
}

// =============================================================================
// FRAMEWORK SPEC -- the single source of truth for framework-specific paths
// and labels. Every consumer (init, future importers) reads from here instead
// of declaring its own.
// =============================================================================

/** Component install paths, per framework. */
export interface ComponentPaths {
  components: string;
  primitives: string;
  composites: string;
  rules: string;
}

/**
 * Framework spec consumed by the init command:
 *   - `label`: human-facing name for the interactive framework prompt
 *     (absent for `unknown`).
 *   - `cssLocations`: candidate paths for the user's main CSS file --
 *     where init injects the `@import ".rafters/output/rafters.css"`.
 *   - `entryPoints`: candidate app entry files that import that CSS.
 *   - `components`: default install paths for `rafters add`.
 *   - `note`: a setup requirement init and add print once per run.
 */
export interface FrameworkSpec {
  label?: string;
  cssLocations: readonly string[];
  /**
   * Candidate app entry files, in order. When init creates the CSS file, it
   * imports it from the first one that exists; with none, it names the first.
   */
  entryPoints: readonly string[];
  components: ComponentPaths;
  /** One line init and add print for this framework, when it needs setup rafters does not do. */
  note?: string;
}

export const FRAMEWORK_SPECS: Record<Framework, FrameworkSpec> = {
  next: {
    label: 'Next.js',
    cssLocations: ['src/app/globals.css', 'app/globals.css', 'styles/globals.css'],
    entryPoints: ['src/app/layout.tsx', 'app/layout.tsx', 'src/app/layout.jsx', 'app/layout.jsx'],
    components: {
      components: 'components/ui',
      primitives: 'lib/primitives',
      composites: 'composites',
      rules: 'lib/rules',
    },
  },
  vite: {
    label: 'Vite',
    cssLocations: ['src/index.css', 'src/main.css', 'src/styles.css', 'src/app.css'],
    entryPoints: ['src/main.tsx', 'src/main.ts', 'src/main.jsx', 'src/main.js'],
    components: {
      components: 'src/components/ui',
      primitives: 'src/lib/primitives',
      composites: 'src/composites',
      rules: 'src/lib/rules',
    },
  },
  remix: {
    label: 'Remix',
    cssLocations: ['app/styles/global.css', 'app/globals.css', 'app/root.css'],
    entryPoints: ['app/root.tsx', 'app/root.jsx'],
    components: {
      components: 'app/components/ui',
      primitives: 'app/lib/primitives',
      composites: 'app/composites',
      rules: 'app/lib/rules',
    },
  },
  'react-router': {
    label: 'React Router v7',
    cssLocations: ['app/app.css', 'app/root.css', 'app/styles.css', 'app/globals.css'],
    entryPoints: ['app/root.tsx', 'app/root.jsx'],
    components: {
      components: 'app/components/ui',
      primitives: 'app/lib/primitives',
      composites: 'app/composites',
      rules: 'app/lib/rules',
    },
  },
  astro: {
    label: 'Astro',
    cssLocations: ['src/styles/global.css', 'src/styles/globals.css', 'src/global.css'],
    entryPoints: ['src/layouts/Layout.astro'],
    components: {
      components: 'src/components/ui',
      primitives: 'src/lib/primitives',
      composites: 'src/composites',
      rules: 'src/lib/rules',
    },
  },
  preact: {
    label: 'Preact',
    cssLocations: ['src/index.css', 'src/main.css', 'src/styles.css', 'src/app.css'],
    entryPoints: ['src/main.tsx', 'src/main.ts', 'src/main.jsx', 'src/main.js'],
    components: {
      components: 'src/components/ui',
      primitives: 'src/lib/primitives',
      composites: 'src/composites',
      rules: 'src/lib/rules',
    },
    note: 'Preact: rafters installs React (.tsx) components, so react and react-dom must alias to preact/compat (@preact/preset-vite sets this up).',
  },
  vanilla: {
    label: 'Vanilla (plain HTML/TS, no framework)',
    cssLocations: ['src/index.css', 'src/main.css', 'src/styles.css', 'styles/global.css'],
    entryPoints: ['src/main.ts', 'src/main.js', 'src/index.ts', 'src/index.js'],
    components: {
      components: 'src/components/ui',
      primitives: 'src/lib/primitives',
      composites: 'src/composites',
      rules: 'src/lib/rules',
    },
  },
  unknown: {
    cssLocations: ['src/styles/global.css', 'src/index.css', 'styles/globals.css'],
    entryPoints: ['src/main.ts', 'src/main.js', 'src/index.ts', 'src/index.js'],
    components: {
      components: 'components/ui',
      primitives: 'lib/primitives',
      composites: 'composites',
      rules: 'lib/rules',
    },
  },
};
