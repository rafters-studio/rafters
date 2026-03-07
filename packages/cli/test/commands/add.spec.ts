/**
 * Integration tests for rafters add command
 *
 * These tests fetch real registry JSON files from the dev server (localhost:4321)
 * and verify end-to-end behavior of component installation.
 *
 * The registry is just static JSON files:
 * - /registry/index.json - list of available components/primitives
 * - /registry/components/{name}.json - component definition
 * - /registry/primitives/{name}.json - primitive definition
 *
 * Following project test strategy:
 * - .spec.ts = integration tests (end-to-end)
 * - Real registry JSON, real file system operations
 * - Test full flows, not implementation details
 *
 * Run with: pnpm --filter website dev (to start registry server)
 */

import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { fetchComponent, installComponent, transformFileContent } from '../../src/commands/add.js';
import { RegistryClient } from '../../src/registry/client.js';

const DEV_REGISTRY_URL = 'http://localhost:4321';
const TEST_DIR = join(tmpdir(), 'rafters-add-spec');

/**
 * Check if the website dev server is running (serves registry JSON files)
 * Checked at module load time so skipIf works correctly
 */
async function checkDevServer(): Promise<boolean> {
  try {
    const response = await fetch(`${DEV_REGISTRY_URL}/registry/index.json`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Check server availability at module load (top-level await)
const DEV_SERVER_AVAILABLE = await checkDevServer();

if (!DEV_SERVER_AVAILABLE) {
  console.warn('⚠️  Dev server not running. Integration tests will be skipped.');
  console.warn('   Start with: pnpm --filter website dev');
}

describe('rafters add - integration', () => {
  beforeEach(async () => {
    if (!DEV_SERVER_AVAILABLE) return;

    // Clean test directory before each test
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(join(TEST_DIR, '.rafters'), { recursive: true });
  });

  afterAll(async () => {
    if (!DEV_SERVER_AVAILABLE) return;

    // Clean up test directory
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('RegistryClient', () => {
    it.skipIf(!DEV_SERVER_AVAILABLE)('fetches registry index from dev server', async () => {
      const client = new RegistryClient(DEV_REGISTRY_URL);
      const index = await client.fetchIndex();

      expect(index.name).toBe('rafters');
      expect(Array.isArray(index.components)).toBe(true);
      expect(Array.isArray(index.primitives)).toBe(true);
    });

    it.skipIf(!DEV_SERVER_AVAILABLE)('fetches button component from registry', async () => {
      const client = new RegistryClient(DEV_REGISTRY_URL);
      const button = await client.fetchComponent('button');

      expect(button.name).toBe('button');
      expect(button.type).toBe('ui');
      expect(button.files.length).toBeGreaterThan(0);
      expect(button.files[0].path).toContain('button');
    });

    it.skipIf(!DEV_SERVER_AVAILABLE)('fetches classy primitive from registry', async () => {
      const client = new RegistryClient(DEV_REGISTRY_URL);
      const classy = await client.fetchPrimitive('classy');

      expect(classy.name).toBe('classy');
      expect(classy.type).toBe('primitive');
      expect(classy.files.length).toBeGreaterThan(0);
    });

    it.skipIf(!DEV_SERVER_AVAILABLE)('returns cached results on repeated fetch', async () => {
      const client = new RegistryClient(DEV_REGISTRY_URL);

      // First fetch
      const button1 = await client.fetchComponent('button');
      // Second fetch (should use cache)
      const button2 = await client.fetchComponent('button');

      expect(button1).toBe(button2); // Same object reference = cached
    });

    it.skipIf(!DEV_SERVER_AVAILABLE)('throws on non-existent component', async () => {
      const client = new RegistryClient(DEV_REGISTRY_URL);

      await expect(client.fetchComponent('does-not-exist')).rejects.toThrow('not found');
    });

    it.skipIf(!DEV_SERVER_AVAILABLE)(
      'resolves component dependencies in correct order',
      async () => {
        const client = new RegistryClient(DEV_REGISTRY_URL);

        // Button depends on classy primitive
        const items = await client.resolveDependencies('button');

        // Should have at least button and its dependencies
        expect(items.length).toBeGreaterThanOrEqual(1);

        // If button has primitives, they should come before button
        const buttonIndex = items.findIndex((item) => item.name === 'button');
        expect(buttonIndex).toBeGreaterThan(-1);

        // Any dependencies should be listed before button
        for (let i = 0; i < buttonIndex; i++) {
          expect(items[buttonIndex].primitives).toContain(items[i].name);
        }
      },
    );
  });

  describe('fetchComponent', () => {
    it.skipIf(!DEV_SERVER_AVAILABLE)('fetches component via exported function', async () => {
      const button = await fetchComponent('button', DEV_REGISTRY_URL);

      expect(button.name).toBe('button');
      expect(button.type).toBe('ui');
    });
  });

  describe('installComponent', () => {
    it.skipIf(!DEV_SERVER_AVAILABLE)('writes component files to target directory', async () => {
      const button = await fetchComponent('button', DEV_REGISTRY_URL);

      await installComponent(button, TEST_DIR, { overwrite: true });

      // Verify files were written
      for (const file of button.files) {
        const filePath = join(TEST_DIR, file.path);
        const content = await readFile(filePath, 'utf-8');
        expect(content).toBeTruthy();
      }
    });

    it.skipIf(!DEV_SERVER_AVAILABLE)('transforms imports in installed files', async () => {
      const button = await fetchComponent('button', DEV_REGISTRY_URL);

      await installComponent(button, TEST_DIR, { overwrite: true });

      // Read installed file and verify import transformation
      for (const file of button.files) {
        const filePath = join(TEST_DIR, file.path);
        const content = await readFile(filePath, 'utf-8');

        // Should not contain relative primitive imports
        expect(content).not.toContain("from '../../primitives/");
        expect(content).not.toContain("from '../primitives/");

        // Transformed imports should use @/lib/primitives/
        if (file.content.includes('primitives/')) {
          expect(content).toContain('@/lib/primitives/');
        }
      }
    });

    it.skipIf(!DEV_SERVER_AVAILABLE)('throws when file exists without overwrite', async () => {
      const button = await fetchComponent('button', DEV_REGISTRY_URL);

      // Install first time
      await installComponent(button, TEST_DIR, { overwrite: true });

      // Try to install again without overwrite
      await expect(installComponent(button, TEST_DIR, { overwrite: false })).rejects.toThrow(
        'already exists',
      );
    });

    it.skipIf(!DEV_SERVER_AVAILABLE)('overwrites files when option is set', async () => {
      const button = await fetchComponent('button', DEV_REGISTRY_URL);

      // Install twice with overwrite
      await installComponent(button, TEST_DIR, { overwrite: true });
      await installComponent(button, TEST_DIR, { overwrite: true });

      // No error means success
      expect(true).toBe(true);
    });
  });

  describe('end-to-end: button with dependencies', () => {
    it.skipIf(!DEV_SERVER_AVAILABLE)('installs button and all its dependencies', async () => {
      const client = new RegistryClient(DEV_REGISTRY_URL);
      const items = await client.resolveDependencies('button');

      // Install all resolved items
      for (const item of items) {
        await installComponent(item, TEST_DIR, { overwrite: true });
      }

      // Verify all files exist
      for (const item of items) {
        for (const file of item.files) {
          const filePath = join(TEST_DIR, file.path);
          const content = await readFile(filePath, 'utf-8');
          expect(content).toBeTruthy();
        }
      }
    });
  });
});

describe('transformFileContent - regression', () => {
  it('handles real button component content from registry', async () => {
    // Real content structure that would come from registry
    const realContent = `import classy from '../../primitives/classy';
import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentPropsWithoutRef, ForwardedRef } from 'react';
import { forwardRef } from 'react';
import { Button as AriaButton } from './button';

export const buttonVariants = cva('button-base', {
  variants: {
    variant: {
      default: 'button-default',
      outline: 'button-outline',
    },
  },
});`;

    const transformed = transformFileContent(realContent);

    // Should transform primitive import
    expect(transformed).toContain("from '@/lib/primitives/classy'");

    // Should transform relative component import
    expect(transformed).toContain("from '@/components/ui/button'");

    // Should preserve npm package imports
    expect(transformed).toContain("from 'class-variance-authority'");
    expect(transformed).toContain("from 'react'");
  });
});
