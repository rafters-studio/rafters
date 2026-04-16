/**
 * Importer Interface Types
 *
 * Standard contracts for all design token importers.
 * All importers output Token[] per @rafters/shared schemas.
 */

import type { Token } from '@rafters/shared';

/**
 * Metadata about an importer
 */
export interface ImporterMetadata {
  /** Unique identifier for this importer */
  id: string;
  /** Human-readable name */
  name: string;
  /** What this importer handles */
  description: string;
  /** File patterns this importer can process */
  filePatterns: string[];
  /** Priority when multiple importers match (higher = preferred) */
  priority: number;
}

/**
 * Result of detecting if an importer can handle a project
 */
export interface ImporterDetection {
  /** Whether this importer can handle the project */
  canImport: boolean;
  /** Confidence score 0-1 */
  confidence: number;
  /** What triggered detection */
  detectedBy: string[];
  /** Path to the source file(s) */
  sourcePaths: string[];
  /** Additional context for the import */
  context?: Record<string, unknown>;
}

/**
 * Warning generated during import
 */
export interface ImportWarning {
  /** Warning severity */
  level: 'info' | 'warning' | 'error';
  /** Warning message */
  message: string;
  /** Source location if applicable */
  source?: {
    file: string;
    line?: number;
    column?: number;
  };
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Result of running an import
 */
export interface ImportResult {
  /** Imported tokens (valid Token[] per @rafters/shared) */
  tokens: Token[];
  /** Warnings generated during import */
  warnings: ImportWarning[];
  /** Which importer produced this result */
  source: string;
  /** How many source variables were processed */
  variablesProcessed: number;
  /** How many were successfully converted to tokens */
  tokensCreated: number;
  /** How many were skipped (with reasons in warnings) */
  skipped: number;
}

/**
 * Standard interface for all design token importers
 */
export interface Importer {
  /** Metadata about this importer */
  metadata: ImporterMetadata;

  /**
   * Detect if this importer can handle the given project
   * @param projectPath - Path to the project root
   * @returns Detection result with confidence score
   */
  detect(projectPath: string): Promise<ImporterDetection>;

  /**
   * Import tokens from the project
   * @param projectPath - Path to the project root
   * @param detection - Detection result from detect()
   * @returns Import result with tokens and warnings
   */
  import(projectPath: string, detection: ImporterDetection): Promise<ImportResult>;
}
