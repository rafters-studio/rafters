/**
 * Integration tests for project root discovery
 *
 * Tests the walk-up-directory logic that finds .rafters/config.rafters.json
 * from nested subdirectories.
 */

import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';
import { discoverProjectRoot } from '../../src/utils/discover.js';
import { createInitializedFixture } from './helpers.js';

let fixturePath = '';

afterEach(async () => {
  if (fixturePath) {
    await cleanupFixture(fixturePath);
    fixturePath = '';
  }
});

describe('discoverProjectRoot', () => {
  it('finds project root from the root directory itself', async () => {
    fixturePath = await createInitializedFixture();

    const result = discoverProjectRoot(fixturePath);
    expect(result).toBe(fixturePath);
  }, 30000);

  it('finds project root from a nested subdirectory', async () => {
    fixturePath = await createInitializedFixture();

    const nestedDir = join(fixturePath, 'src', 'components', 'ui');
    await mkdir(nestedDir, { recursive: true });

    const result = discoverProjectRoot(nestedDir);
    expect(result).toBe(fixturePath);
  }, 30000);

  it('finds project root from a deeply nested path', async () => {
    fixturePath = await createInitializedFixture();

    const deepDir = join(fixturePath, 'src', 'app', 'dashboard', 'settings', 'profile');
    await mkdir(deepDir, { recursive: true });

    const result = discoverProjectRoot(deepDir);
    expect(result).toBe(fixturePath);
  }, 30000);

  it('returns null when no project root exists', async () => {
    // Use a fixture without .rafters (not initialized)
    fixturePath = await createFixture('empty-project');

    const result = discoverProjectRoot(fixturePath);
    expect(result).toBeNull();
  });

  it('does not traverse into sibling directories', async () => {
    fixturePath = await createInitializedFixture();

    // Create a subdirectory that does NOT have .rafters above it
    // by checking from a sibling of the fixture within the same parent
    const siblingDir = join(fixturePath, '..', 'no-rafters-sibling');
    await mkdir(siblingDir, { recursive: true });

    const result = discoverProjectRoot(siblingDir);
    // Should not find the fixture's .rafters since it is a sibling, not an ancestor
    expect(result).toBeNull();

    await rm(siblingDir, { recursive: true, force: true });
  });
});
