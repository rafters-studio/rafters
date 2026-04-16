/**
 * Path utilities for .rafters/ directory structure
 */

import { join } from 'node:path';

export interface RaftersPaths {
  root: string;
  config: string;
  tokens: string;
  output: string;
  importPending: string;
}

/**
 * Get all .rafters/ paths for a project
 */
export function getRaftersPaths(projectRoot: string = process.cwd()): RaftersPaths {
  const root = join(projectRoot, '.rafters');
  return {
    root,
    config: join(root, 'config.rafters.json'),
    tokens: join(root, 'tokens'),
    output: join(root, 'output'),
    importPending: join(root, 'import-pending.json'),
  };
}

/**
 * Get path to a namespace token file
 */
export function getTokenFilePath(projectRoot: string, namespace: string): string {
  return join(projectRoot, '.rafters', 'tokens', `${namespace}.rafters.json`);
}

/**
 * Get path to an output file
 */
export function getOutputFilePath(
  projectRoot: string,
  filename: 'theme.css' | 'tokens.json' | 'tokens.ts',
): string {
  return join(projectRoot, '.rafters', 'output', filename);
}
