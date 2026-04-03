/**
 * Project detection utilities
 *
 * Detects framework, Tailwind version, and shadcn configuration
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type Framework = 'next' | 'vite' | 'remix' | 'react-router' | 'astro' | 'unknown';

export interface ShadcnConfig {
  tailwind?: {
    css?: string;
  };
}

export interface ProjectDetection {
  framework: Framework;
  shadcn: ShadcnConfig | null;
  tailwindVersion: string | null;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// Config files that indicate a specific framework, checked as a fallback
// when package.json dependency detection returns 'unknown'.
const CONFIG_FILE_FRAMEWORKS: Array<{ files: string[]; framework: Framework }> = [
  { files: ['astro.config.mjs', 'astro.config.ts', 'astro.config.js'], framework: 'astro' },
  { files: ['next.config.mjs', 'next.config.ts', 'next.config.js'], framework: 'next' },
  { files: ['remix.config.js', 'remix.config.ts'], framework: 'remix' },
  { files: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'], framework: 'vite' },
];

/**
 * Detect the framework used in the project by checking package.json dependencies,
 * falling back to framework config files when dependencies are inconclusive.
 */
export async function detectFramework(cwd: string): Promise<Framework> {
  try {
    const content = await readFile(join(cwd, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content) as PackageJson;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Check for frameworks in order of specificity
    if (deps.next) {
      return 'next';
    }

    // React Router v7 uses react-router package (check before Remix)
    if (deps['react-router']) {
      return 'react-router';
    }

    // Remix packages all start with @remix-run/
    const hasRemix = Object.keys(deps).some((dep) => dep.startsWith('@remix-run/'));
    if (hasRemix) {
      return 'remix';
    }

    if (deps.astro) {
      return 'astro';
    }

    if (deps.vite) {
      return 'vite';
    }
  } catch {
    // package.json missing or unreadable, fall through to config file check
  }

  return detectFrameworkFromConfigFiles(cwd);
}

/**
 * Fallback detection: check for framework-specific config files on disk.
 */
function detectFrameworkFromConfigFiles(cwd: string): Framework {
  for (const { files, framework } of CONFIG_FILE_FRAMEWORKS) {
    for (const file of files) {
      if (existsSync(join(cwd, file))) {
        return framework;
      }
    }
  }
  return 'unknown';
}

/**
 * Detect the Tailwind CSS version installed in the project
 * Returns the version string or null if not installed
 */
export async function detectTailwindVersion(cwd: string): Promise<string | null> {
  try {
    const content = await readFile(join(cwd, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content) as PackageJson;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const tailwindVersion = deps.tailwindcss;
    if (!tailwindVersion) {
      return null;
    }

    // Extract version number, handling ranges like ^4.0.0, ~4.0.0, >=4.0.0
    // Remove leading ^, ~, >=, >, =, etc.
    const versionMatch = tailwindVersion.match(/\d+\.\d+\.\d+/);
    return versionMatch ? versionMatch[0] : tailwindVersion;
  } catch {
    return null;
  }
}

/**
 * Check if the detected Tailwind version is v3 (not supported)
 */
export function isTailwindV3(version: string | null): boolean {
  if (!version) {
    return false;
  }
  return version.startsWith('3.');
}

/**
 * Detect shadcn configuration by looking for components.json
 */
export async function detectShadcn(cwd: string): Promise<ShadcnConfig | null> {
  try {
    const content = await readFile(join(cwd, 'components.json'), 'utf-8');
    return JSON.parse(content) as ShadcnConfig;
  } catch {
    return null;
  }
}

/**
 * Component target derived from framework.
 * Determines which file extension to prefer when installing components.
 */
export type ComponentTarget = 'react' | 'astro' | 'vue' | 'svelte';

/**
 * Map a framework to its default component target.
 * All React-based frameworks (next, vite, remix, react-router) map to 'react'.
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

/**
 * Check if an Astro project has @astrojs/react installed
 */
export async function hasAstroReact(cwd: string): Promise<boolean> {
  try {
    const content = await readFile(join(cwd, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content) as PackageJson;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Boolean(deps['@astrojs/react']);
  } catch {
    return false;
  }
}

/**
 * Detect all project configuration at once
 * Returns framework, shadcn config, and Tailwind version
 */
export async function detectProject(cwd: string): Promise<ProjectDetection> {
  const [framework, shadcn, tailwindVersion] = await Promise.all([
    detectFramework(cwd),
    detectShadcn(cwd),
    detectTailwindVersion(cwd),
  ]);

  return {
    framework,
    shadcn,
    tailwindVersion,
  };
}
