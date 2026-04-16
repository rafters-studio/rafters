/**
 * Onboarding Orchestrator
 *
 * Coordinates the import process: detect source, run importer, output tokens.
 * This is the main entry point for the onboarding system.
 */

import type { Token } from '@rafters/shared';
import { genericCSSImporter } from './importers/generic-css.js';
import {
  detectAllImporters,
  findBestImporter,
  type ImporterDetection,
  type ImportResult,
  registerImporter,
} from './importers/index.js';
import { shadcnImporter } from './importers/shadcn.js';
import { tailwindV4Importer } from './importers/tailwind-v4.js';

// Register built-in importers on module load
let importersRegistered = false;

function ensureImportersRegistered(): void {
  if (importersRegistered) return;
  registerImporter(tailwindV4Importer);
  registerImporter(shadcnImporter);
  registerImporter(genericCSSImporter);
  importersRegistered = true;
}

/**
 * Result of running the orchestrator
 */
export interface OnboardResult {
  /** Whether the onboarding succeeded */
  success: boolean;
  /** Imported tokens (empty if failed) */
  tokens: Token[];
  /** Which importer was used */
  source: string | null;
  /** Detection confidence (0-1) */
  confidence: number;
  /** What triggered detection */
  detectedBy: string[];
  /** Source file paths */
  sourcePaths: string[];
  /** Warnings and errors from the import process */
  warnings: ImportResult['warnings'];
  /** Statistics */
  stats: {
    variablesProcessed: number;
    tokensCreated: number;
    skipped: number;
  };
}

/**
 * Options for the onboard function
 */
export interface OnboardOptions {
  /** Force a specific importer by ID */
  forceImporter?: string;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
}

/**
 * Onboard a project by detecting and importing design tokens
 *
 * @param projectPath - Path to the project root
 * @param options - Optional configuration
 * @returns Onboard result with tokens and metadata
 */
export async function onboard(
  projectPath: string,
  options: OnboardOptions = {},
): Promise<OnboardResult> {
  ensureImportersRegistered();

  const { forceImporter, minConfidence = 0 } = options;

  // Find the best importer
  let match:
    | {
        importer: { metadata: { id: string }; import: typeof shadcnImporter.import };
        detection: ImporterDetection;
      }
    | undefined;

  if (forceImporter) {
    // Force a specific importer
    const allMatches = await detectAllImporters(projectPath);
    match = allMatches.find((m) => m.importer.metadata.id === forceImporter);

    if (!match) {
      return {
        success: false,
        tokens: [],
        source: null,
        confidence: 0,
        detectedBy: [],
        sourcePaths: [],
        warnings: [
          {
            level: 'error',
            message: `Importer "${forceImporter}" not found or cannot handle this project`,
          },
        ],
        stats: { variablesProcessed: 0, tokensCreated: 0, skipped: 0 },
      };
    }
  } else {
    // Auto-detect the best importer
    match = await findBestImporter(projectPath);

    if (!match) {
      return {
        success: false,
        tokens: [],
        source: null,
        confidence: 0,
        detectedBy: [],
        sourcePaths: [],
        warnings: [
          {
            level: 'error',
            message: 'No compatible design token source detected',
            suggestion: 'Ensure your project has CSS files with custom properties',
          },
        ],
        stats: { variablesProcessed: 0, tokensCreated: 0, skipped: 0 },
      };
    }
  }

  // Check confidence threshold
  if (match.detection.confidence < minConfidence) {
    return {
      success: false,
      tokens: [],
      source: match.importer.metadata.id,
      confidence: match.detection.confidence,
      detectedBy: match.detection.detectedBy,
      sourcePaths: match.detection.sourcePaths,
      warnings: [
        {
          level: 'error',
          message: `Detection confidence ${(match.detection.confidence * 100).toFixed(0)}% is below threshold ${(minConfidence * 100).toFixed(0)}%`,
        },
      ],
      stats: { variablesProcessed: 0, tokensCreated: 0, skipped: 0 },
    };
  }

  // Run the import
  const result = await match.importer.import(projectPath, match.detection);

  // Check for import errors
  const hasErrors = result.warnings.some((w) => w.level === 'error');

  return {
    success: !hasErrors && result.tokens.length > 0,
    tokens: result.tokens,
    source: result.source,
    confidence: match.detection.confidence,
    detectedBy: match.detection.detectedBy,
    sourcePaths: match.detection.sourcePaths,
    warnings: result.warnings,
    stats: {
      variablesProcessed: result.variablesProcessed,
      tokensCreated: result.tokensCreated,
      skipped: result.skipped,
    },
  };
}

/**
 * Preview what would be imported without actually importing
 *
 * @param projectPath - Path to the project root
 * @returns Detection results for all compatible importers
 */
export async function previewOnboard(projectPath: string): Promise<
  Array<{
    importer: string;
    name: string;
    confidence: number;
    detectedBy: string[];
    sourcePaths: string[];
  }>
> {
  ensureImportersRegistered();

  const matches = await detectAllImporters(projectPath);

  return matches.map((m) => ({
    importer: m.importer.metadata.id,
    name: m.importer.metadata.name,
    confidence: m.detection.confidence,
    detectedBy: m.detection.detectedBy,
    sourcePaths: m.detection.sourcePaths,
  }));
}

// Re-export for convenience
export { registerImporter } from './importers/index.js';
