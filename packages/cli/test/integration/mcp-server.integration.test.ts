/**
 * Integration tests for the MCP tool surface against CLI-initialized projects.
 *
 * Validates the full pipeline: `rafters init` writes a real
 * `.rafters/config.rafters.json`, and RaftersToolHandler resolves workspaces,
 * reads that config (overlay context, wiring writes), and dispatches the new
 * describe/workspaces/generate surface against it.
 *
 * The intel graph is populated from an injected fixture catalog rather than the
 * live registry -- these tests exercise the dispatch and the on-disk config
 * pipeline, not the network fetch (that is covered by RegistryClient's own unit
 * tests, bulk endpoint + per-item fallback).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { RaftersToolHandler } from '../../src/mcp/tools.js';
import type { RegistryItem } from '../../src/registry/types.js';
import { cleanupFixture } from '../fixtures/projects.js';
import { createInitializedFixture, readConfig, writeFixtureFile } from './helpers.js';

let fixturePath = '';

afterEach(async () => {
  if (fixturePath) {
    await cleanupFixture(fixturePath);
    fixturePath = '';
  }
});

function node(name: string, type: RegistryItem['type']): RegistryItem {
  return { name, type, primitives: [], files: [], rules: [], composites: [], facets: {} };
}

const FIXTURE: RegistryItem[] = [node('button', 'ui'), node('modal', 'ui'), node('alert', 'ui')];

function handlerFor(root: string): RaftersToolHandler {
  return new RaftersToolHandler(
    [{ name: 'fixture', root }],
    { name: 'fixture', root },
    async () => FIXTURE,
  );
}

describe('MCP describe/generate against an initialized project', () => {
  it('rafters_describe resolves a dot-address to a node', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = handlerFor(fixturePath);

    const result = await handler.handleToolCall('rafters_describe', { address: 'button' });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toMatchObject({ id: 'button', kind: 'component' });
  }, 30000);

  it('rafters_describe routes a natural-language question through the intent door', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = handlerFor(fixturePath);

    const result = await handler.handleToolCall('rafters_describe', {
      address: 'what do I use when it needs to be above everything',
    });
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toMatchObject({ use: { id: 'modal' }, not: { id: 'alert' } });
  }, 30000);

  it('rafters_generate returns an honest stub', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = handlerFor(fixturePath);

    const result = await handler.handleToolCall('rafters_generate', { intent: 'a login form' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toMatchObject({ implemented: false });
  }, 30000);

  it('deprecated rafters_component forwards by-id and is marked', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = handlerFor(fixturePath);

    const result = await handler.handleToolCall('rafters_component', { name: 'button' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toMatchObject({ id: 'button', deprecated: 'use rafters_describe instead' });
  }, 30000);

  it('folds installed.primitives into the component set for presence', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');

    // Install `classy` (a primitive) via installed.primitives. A primitive-kind
    // item resolves to graph kind `component`, so without the fold it would
    // misreport as `available`; the fold makes it read `installed`.
    const config = await readConfig(fixturePath);
    const installed = (config.installed as Record<string, string[]>) ?? {};
    config.installed = { ...installed, primitives: ['classy'] };
    await writeFixtureFile(fixturePath, '.rafters/config.rafters.json', JSON.stringify(config));

    // A catalog with a primitive (classy) and a ui component (button).
    const handler = new RaftersToolHandler(
      [{ name: 'fixture', root: fixturePath }],
      { name: 'fixture', root: fixturePath },
      async () => [node('classy', 'primitive'), node('button', 'ui')],
    );

    const result = await handler.handleToolCall('rafters_describe', { address: 'components' });
    const roster = JSON.parse(result.content[0].text as string) as Array<{
      id: string;
      presence: string;
    }>;
    const byId = new Map(roster.map((e) => [e.id, e.presence]));
    expect(byId.get('classy')).toBe('installed');
    // A component not in any installed list stays available -- proving the fold
    // is targeted, not a blanket "everything installed".
    expect(byId.get('button')).toBe('available');
  }, 30000);
});

describe('MCP rafters_workspaces config pipeline (unchanged)', () => {
  it('writes a wiring patch to the config', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = handlerFor(fixturePath);

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

    const config = await readConfig(fixturePath);
    expect(config.registryUrl).toBe('https://registry.example.test');
    expect(config.cssPath).toBe('src/styles/app.css');
    expect(config.framework).toBeDefined();
  }, 30000);

  it('merges the exports field instead of overwriting it', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = handlerFor(fixturePath);

    const before = await readConfig(fixturePath);
    const beforeExports = before.exports as Record<string, boolean>;

    const result = await handler.handleToolCall('rafters_workspaces', {
      exports: { dtcg: true },
    });
    expect(JSON.parse(result.content[0].text as string).ok).toBe(true);

    const after = await readConfig(fixturePath);
    const afterExports = after.exports as Record<string, boolean>;
    expect(afterExports.dtcg).toBe(true);
    expect(afterExports.tailwind).toBe(beforeExports.tailwind);
    expect(afterExports.typescript).toBe(beforeExports.typescript);
  }, 30000);

  it('refuses to write a designer-owned field', async () => {
    fixturePath = await createInitializedFixture('vite-no-shadcn');
    const handler = handlerFor(fixturePath);

    const before = await readConfig(fixturePath);
    const result = await handler.handleToolCall('rafters_workspaces', { darkMode: 'media' });

    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toMatch(/Studio/);

    const after = await readConfig(fixturePath);
    expect(after.darkMode).toBe(before.darkMode);
  }, 30000);
});

describe('MCP tools with null project root', () => {
  it('rafters_describe resolves against the injected catalog without a project root', async () => {
    const handler = new RaftersToolHandler([], null, async () => FIXTURE);

    const result = await handler.handleToolCall('rafters_describe', { address: 'button' });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toMatchObject({ id: 'button', kind: 'component' });
  });

  it('rafters_workspaces returns the empty list without a project root', async () => {
    const handler = new RaftersToolHandler([], null, async () => FIXTURE);

    const result = await handler.handleToolCall('rafters_workspaces', {});
    const data = JSON.parse(result.content[0].text as string);
    expect(data.workspaces).toEqual([]);
    expect(data.defaultWorkspace).toBeNull();
  });
});

describe('unknown tool', () => {
  it('returns error for unknown tool', async () => {
    const handler = new RaftersToolHandler([], null, async () => FIXTURE);
    const result = await handler.handleToolCall('unknown_tool', {});

    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('Unknown tool');
  });
});
