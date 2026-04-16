import { afterEach, describe, expect, it } from 'vitest';
import {
  clearImporters,
  detectAllImporters,
  findBestImporter,
  getAllImporters,
  getImporter,
  type Importer,
  type ImporterDetection,
  type ImportResult,
  registerImporter,
} from '../../../src/onboard/importers/index.js';

// Mock importer factory
function createMockImporter(
  id: string,
  priority: number,
  canImport: boolean,
  confidence: number,
): Importer {
  return {
    metadata: {
      id,
      name: `Mock ${id}`,
      description: `Mock importer ${id}`,
      filePatterns: ['*.css'],
      priority,
    },
    async detect(): Promise<ImporterDetection> {
      return {
        canImport,
        confidence,
        detectedBy: ['mock'],
        sourcePaths: ['/mock/path.css'],
      };
    },
    async import(): Promise<ImportResult> {
      return {
        tokens: [],
        warnings: [],
        source: id,
        variablesProcessed: 0,
        tokensCreated: 0,
        skipped: 0,
      };
    },
  };
}

describe('Importer Registry', () => {
  afterEach(() => {
    clearImporters();
  });

  describe('registerImporter', () => {
    it('registers an importer', () => {
      const importer = createMockImporter('test', 10, true, 1);
      registerImporter(importer);

      expect(getImporter('test')).toBe(importer);
    });

    it('throws on duplicate registration', () => {
      const importer = createMockImporter('test', 10, true, 1);
      registerImporter(importer);

      expect(() => registerImporter(importer)).toThrow('already registered');
    });
  });

  describe('getAllImporters', () => {
    it('returns importers sorted by priority', () => {
      registerImporter(createMockImporter('low', 1, true, 1));
      registerImporter(createMockImporter('high', 100, true, 1));
      registerImporter(createMockImporter('mid', 50, true, 1));

      const importers = getAllImporters();
      expect(importers.map((i) => i.metadata.id)).toEqual(['high', 'mid', 'low']);
    });

    it('returns empty array when no importers registered', () => {
      expect(getAllImporters()).toEqual([]);
    });
  });

  describe('getImporter', () => {
    it('returns undefined for unknown importer', () => {
      expect(getImporter('nonexistent')).toBeUndefined();
    });
  });

  describe('detectAllImporters', () => {
    it('returns only importers that can import', async () => {
      registerImporter(createMockImporter('can', 10, true, 0.8));
      registerImporter(createMockImporter('cannot', 20, false, 0));

      const results = await detectAllImporters('/project');
      expect(results).toHaveLength(1);
      expect(results[0].importer.metadata.id).toBe('can');
    });

    it('sorts by confidence then priority', async () => {
      registerImporter(createMockImporter('low-conf', 100, true, 0.5));
      registerImporter(createMockImporter('high-conf', 10, true, 0.9));
      registerImporter(createMockImporter('high-conf-low-pri', 5, true, 0.9));

      const results = await detectAllImporters('/project');
      expect(results.map((r) => r.importer.metadata.id)).toEqual([
        'high-conf',
        'high-conf-low-pri',
        'low-conf',
      ]);
    });
  });

  describe('findBestImporter', () => {
    it('returns the best matching importer', async () => {
      registerImporter(createMockImporter('good', 10, true, 0.7));
      registerImporter(createMockImporter('best', 10, true, 0.95));

      const result = await findBestImporter('/project');
      expect(result?.importer.metadata.id).toBe('best');
    });

    it('returns undefined when no importers match', async () => {
      registerImporter(createMockImporter('cannot', 10, false, 0));

      const result = await findBestImporter('/project');
      expect(result).toBeUndefined();
    });
  });
});
