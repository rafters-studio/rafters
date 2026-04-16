/**
 * Importer Registry
 *
 * Central registry for all design token importers.
 * Importers register themselves and can be queried by the orchestrator.
 */

import type { Importer, ImporterDetection } from './types.js';

export * from './types.js';

// Registry storage
const importerRegistry = new Map<string, Importer>();

/**
 * Register an importer
 * @throws If an importer with the same ID is already registered
 */
export function registerImporter(importer: Importer): void {
  const id = importer.metadata.id;
  if (importerRegistry.has(id)) {
    throw new Error(`Importer "${id}" is already registered`);
  }
  importerRegistry.set(id, importer);
}

/**
 * Get all registered importers
 * @returns Array of importers sorted by priority (highest first)
 */
export function getAllImporters(): Importer[] {
  return Array.from(importerRegistry.values()).sort(
    (a, b) => b.metadata.priority - a.metadata.priority,
  );
}

/**
 * Get a specific importer by ID
 */
export function getImporter(id: string): Importer | undefined {
  return importerRegistry.get(id);
}

/**
 * Clear all registered importers (for testing)
 */
export function clearImporters(): void {
  importerRegistry.clear();
}

/**
 * Run detection across all importers and return matches
 * @param projectPath - Path to the project root
 * @returns Array of [importer, detection] pairs, sorted by confidence
 */
export async function detectAllImporters(
  projectPath: string,
): Promise<Array<{ importer: Importer; detection: ImporterDetection }>> {
  const importers = getAllImporters();
  const results: Array<{ importer: Importer; detection: ImporterDetection }> = [];

  for (const importer of importers) {
    try {
      const detection = await importer.detect(projectPath);
      if (detection.canImport) {
        results.push({ importer, detection });
      }
    } catch (err) {
      // Log detection failures for debugging - don't swallow silently
      if (process.env.DEBUG || process.env.RAFTERS_DEBUG) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Importer "${importer.metadata.id}" detection failed: ${message}`);
      }
    }
  }

  // Sort by confidence (highest first), then by priority
  return results.sort((a, b) => {
    const confidenceDiff = b.detection.confidence - a.detection.confidence;
    if (confidenceDiff !== 0) return confidenceDiff;
    return b.importer.metadata.priority - a.importer.metadata.priority;
  });
}

/**
 * Find the best importer for a project
 * @param projectPath - Path to the project root
 * @returns Best matching importer and its detection, or undefined if none match
 */
export async function findBestImporter(
  projectPath: string,
): Promise<{ importer: Importer; detection: ImporterDetection } | undefined> {
  const matches = await detectAllImporters(projectPath);
  return matches[0];
}
