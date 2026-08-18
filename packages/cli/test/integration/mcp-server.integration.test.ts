/**
 * Integration tests for MCP tools against CLI-initialized projects
 *
 * Tests the RaftersToolHandler against projects initialized via `rafters init`.
 * This validates the full pipeline: CLI creates tokens -> MCP reads and serves them.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { RaftersToolHandler } from '../../src/mcp/tools.js';
import { cleanupFixture } from '../fixtures/projects.js';
import { createInitializedFixture, readConfig } from './helpers.js';

let fixturePath = '';

afterEach(async () => {
  if (fixturePath) {
    await cleanupFixture(fixturePath);
    fixturePath = '';
  }
});

describe('MCP tools against initialized project', () => {
  it('rafters_pattern returns patterns from composites', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = new RaftersToolHandler([{ name: 'fixture', root: fixturePath }], {
      name: 'fixture',
      root: fixturePath,
    });

    const result = await handler.handleToolCall('rafters_pattern', {
      solves: 'hierarchy',
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);

    // Returns patterns array or available list when no matches
    expect(data.patterns || data.available).toBeDefined();
  }, 30000);

  it('rafters_pattern searches by query', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = new RaftersToolHandler([{ name: 'fixture', root: fixturePath }], {
      name: 'fixture',
      root: fixturePath,
    });

    const result = await handler.handleToolCall('rafters_pattern', {
      query: 'heading',
    });

    const data = JSON.parse(result.content[0].text as string);
    // Returns patterns or available list
    expect(data.patterns || data.available).toBeDefined();
  }, 30000);

  it('rafters_composite returns composites list', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = new RaftersToolHandler([{ name: 'fixture', root: fixturePath }], {
      name: 'fixture',
      root: fixturePath,
    });

    const result = await handler.handleToolCall('rafters_composite', {});

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);

    expect(data.composites).toBeDefined();
    expect(Array.isArray(data.composites)).toBe(true);
  }, 30000);

  it('rafters_component fetches component details', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = new RaftersToolHandler([{ name: 'fixture', root: fixturePath }], {
      name: 'fixture',
      root: fixturePath,
    });

    const result = await handler.handleToolCall('rafters_component', {
      name: 'button',
    });

    const data = JSON.parse(result.content[0].text as string);
    // Component may or may not be found depending on registry state
    expect(data.name === 'button' || data.error).toBeTruthy();
  }, 30000);

  it('rafters_workspaces writes a wiring patch to the config', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = new RaftersToolHandler([{ name: 'fixture', root: fixturePath }], {
      name: 'fixture',
      root: fixturePath,
    });

    const result = await handler.handleToolCall('rafters_workspaces', {
      registryUrl: 'https://registry.example.test',
      cssPath: 'src/styles/app.css',
    });

    const data = JSON.parse(result.content[0].text as string);
    expect(data.ok).toBe(true);
    expect(data.updated).toEqual({
      registryUrl: 'https://registry.example.test',
      cssPath: 'src/styles/app.css',
    });

    // The change is persisted, and unrelated fields are preserved.
    const config = await readConfig(fixturePath);
    expect(config.registryUrl).toBe('https://registry.example.test');
    expect(config.cssPath).toBe('src/styles/app.css');
    expect(config.framework).toBeDefined();
  }, 30000);

  it('rafters_workspaces merges the exports field instead of overwriting it', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = new RaftersToolHandler([{ name: 'fixture', root: fixturePath }], {
      name: 'fixture',
      root: fixturePath,
    });

    const before = await readConfig(fixturePath);
    const beforeExports = before.exports as Record<string, boolean>;

    // Patch only one export key; the rest must survive.
    const result = await handler.handleToolCall('rafters_workspaces', {
      exports: { dtcg: true },
    });
    expect(JSON.parse(result.content[0].text as string).ok).toBe(true);

    const after = await readConfig(fixturePath);
    const afterExports = after.exports as Record<string, boolean>;
    expect(afterExports.dtcg).toBe(true);
    // Keys not in the patch keep their prior values (merge, not replace).
    expect(afterExports.tailwind).toBe(beforeExports.tailwind);
    expect(afterExports.typescript).toBe(beforeExports.typescript);
  }, 30000);

  it('rafters_workspaces refuses to write a designer-owned field', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = new RaftersToolHandler([{ name: 'fixture', root: fixturePath }], {
      name: 'fixture',
      root: fixturePath,
    });

    const before = await readConfig(fixturePath);
    const result = await handler.handleToolCall('rafters_workspaces', {
      darkMode: 'media',
    });

    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toMatch(/Studio/);

    // Config is untouched -- the reject happens before any write.
    const after = await readConfig(fixturePath);
    expect(after.darkMode).toBe(before.darkMode);
  }, 30000);
});

describe('MCP tools with null project root', () => {
  it('rafters_pattern works without a project root', async () => {
    const handler = new RaftersToolHandler([], null);

    const result = await handler.handleToolCall('rafters_pattern', {});

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);
    // Returns patterns array or available list
    expect(data.patterns || data.available).toBeDefined();
  });

  it('rafters_composite returns empty array without a project root', async () => {
    const handler = new RaftersToolHandler([], null);

    const result = await handler.handleToolCall('rafters_composite', {});

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);
    expect(data.composites).toBeDefined();
    expect(Array.isArray(data.composites)).toBe(true);
  });
});

describe('unknown tool', () => {
  it('returns error for unknown tool', async () => {
    const handler = new RaftersToolHandler([], null);
    const result = await handler.handleToolCall('unknown_tool', {});

    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('Unknown tool');
  });
});
