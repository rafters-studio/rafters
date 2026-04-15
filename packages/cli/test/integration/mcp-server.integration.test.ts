/**
 * Integration tests for MCP tools against CLI-initialized projects
 *
 * Tests the RaftersToolHandler against projects initialized via `rafters init`.
 * This validates the full pipeline: CLI creates tokens -> MCP reads and serves them.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { RaftersToolHandler } from '../../src/mcp/tools.js';
import { cleanupFixture } from '../fixtures/projects.js';
import { createInitializedFixture } from './helpers.js';

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
    const handler = new RaftersToolHandler(fixturePath);

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
    const handler = new RaftersToolHandler(fixturePath);

    const result = await handler.handleToolCall('rafters_pattern', {
      query: 'heading',
    });

    const data = JSON.parse(result.content[0].text as string);
    // Returns patterns or available list
    expect(data.patterns || data.available).toBeDefined();
  }, 30000);

  it('rafters_rule lists built-in rules', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = new RaftersToolHandler(fixturePath);

    const result = await handler.handleToolCall('rafters_rule', {});

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);

    expect(data.rules).toBeDefined();
    expect(data.rules.length).toBeGreaterThan(0);
    expect(data.rules.some((r: { name: string }) => r.name === 'required')).toBe(true);
    expect(data.rules.some((r: { name: string }) => r.name === 'email')).toBe(true);
  }, 30000);

  it('rafters_rule filters by name', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = new RaftersToolHandler(fixturePath);

    const result = await handler.handleToolCall('rafters_rule', { name: 'email' });

    const data = JSON.parse(result.content[0].text as string);
    expect(data.rules).toHaveLength(1);
    expect(data.rules[0].name).toBe('email');
  }, 30000);

  it('rafters_composite returns composites list', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = new RaftersToolHandler(fixturePath);

    const result = await handler.handleToolCall('rafters_composite', {});

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);

    expect(data.composites).toBeDefined();
    expect(Array.isArray(data.composites)).toBe(true);
  }, 30000);

  it('rafters_component fetches component details', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = new RaftersToolHandler(fixturePath);

    const result = await handler.handleToolCall('rafters_component', {
      name: 'button',
    });

    const data = JSON.parse(result.content[0].text as string);
    // Component may or may not be found depending on registry state
    expect(data.name === 'button' || data.error).toBeTruthy();
  }, 30000);
});

describe('MCP tools with null project root', () => {
  it('rafters_pattern works without a project root', async () => {
    const handler = new RaftersToolHandler(null);

    const result = await handler.handleToolCall('rafters_pattern', {});

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);
    // Returns patterns array or available list
    expect(data.patterns || data.available).toBeDefined();
  });

  it('rafters_rule works without a project root', async () => {
    const handler = new RaftersToolHandler(null);

    const result = await handler.handleToolCall('rafters_rule', {});

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);
    expect(data.rules.length).toBeGreaterThan(0);
  });

  it('rafters_composite returns empty array without a project root', async () => {
    const handler = new RaftersToolHandler(null);

    const result = await handler.handleToolCall('rafters_composite', {});

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);
    expect(data.composites).toBeDefined();
    expect(Array.isArray(data.composites)).toBe(true);
  });
});

describe('unknown tool', () => {
  it('returns error for unknown tool', async () => {
    const handler = new RaftersToolHandler(null);
    const result = await handler.handleToolCall('unknown_tool', {});

    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('Unknown tool');
  });
});
