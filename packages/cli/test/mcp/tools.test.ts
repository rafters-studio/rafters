import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerComposite } from '@rafters/composites';
import { describe, expect, it, vi } from 'vitest';
import * as intent from '../../src/mcp/intent.js';
import { RaftersToolHandler, TOOL_DEFINITIONS } from '../../src/mcp/tools.js';
import type { RegistryItem } from '../../src/registry/types.js';

/** Minimal, schema-valid registry item for the in-memory fixture catalog. */
function node(name: string, type: RegistryItem['type'], composites: string[] = []): RegistryItem {
  return { name, type, primitives: [], files: [], rules: [], composites, facets: {} };
}

// A fixture catalog large enough to exercise every dispatch path. modal/alert/
// tooltip are the nodes intent.ts's curated INTENT_TAGS route over.
const FIXTURE: RegistryItem[] = [
  node('button', 'ui'),
  node('container', 'ui'),
  node('modal', 'ui'),
  node('alert', 'ui'),
  node('tooltip', 'ui'),
  node('login-form', 'composite'),
];

/**
 * A handler wired to an injected, per-workspace-counting item source -- no
 * network. Returns the handler plus the call counter so laziness/caching are
 * observed through fetch counts, not private fields.
 */
function fixtureHandler(
  workspaces: Array<{ name: string; root: string }>,
  defaultWorkspace: { name: string; root: string } | null,
  items: RegistryItem[] = FIXTURE,
): { handler: RaftersToolHandler; calls: Record<string, number> } {
  const calls: Record<string, number> = {};
  const handler = new RaftersToolHandler(workspaces, defaultWorkspace, async (ws) => {
    const key = ws?.root ?? '';
    calls[key] = (calls[key] ?? 0) + 1;
    return items;
  });
  return { handler, calls };
}

describe('TOOL_DEFINITIONS', () => {
  it('exposes the new primary surface plus deprecated aliases', () => {
    expect(TOOL_DEFINITIONS.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'rafters_workspaces',
        'rafters_describe',
        'rafters_generate',
        'rafters_component',
        'rafters_composite',
        'rafters_pattern',
      ]),
    );
  });

  it('marks the three aliases as deprecated in their descriptions', () => {
    for (const name of ['rafters_component', 'rafters_composite', 'rafters_pattern']) {
      const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
      expect(tool?.description).toContain('[DEPRECATED');
    }
  });

  it('has an object input schema for every tool', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });
});

describe('rafters_describe dispatch', () => {
  it('resolves a dot-address through describe/overlay', async () => {
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_describe', { address: 'button' });
    expect(JSON.parse(result.content[0].text as string)).toMatchObject({
      id: 'button',
      kind: 'component',
    });
  });

  it('routes a natural-language question through the intent door', async () => {
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_describe', {
      address: 'what do I use when it needs to be above everything',
    });
    expect(JSON.parse(result.content[0].text as string)).toMatchObject({
      use: { id: 'modal' },
      not: { id: 'alert' },
    });
  });

  it('stamps workspace presence onto a roster call', async () => {
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_describe', { address: 'components' });
    const data = JSON.parse(result.content[0].text as string) as Array<{
      id: string;
      presence: string;
    }>;
    // Nothing installed in a config-less workspace -> everything available.
    expect(data.every((entry) => entry.presence === 'available')).toBe(true);
    expect(data.map((e) => e.id)).toEqual(expect.arrayContaining(['button', 'modal']));
  });

  it('returns a structured error (not a throw) when the graph is broken', async () => {
    // A dangling composesWith edge makes #2072's assembleGraph throw at build.
    const broken = [node('button', 'ui', ['does-not-exist'])];
    const { handler } = fixtureHandler([], null, broken);
    const result = await handler.handleToolCall('rafters_describe', { address: 'button' });
    expect(JSON.parse(result.content[0].text as string).error).toMatch(
      /failed to build intel graph/,
    );
  });

  it('passes the workspace target (here: none) into describe -- degraded, no prop children', async () => {
    // A config-less workspace has no componentTarget, so the dispatch hands
    // describe an undefined target. A facet-bearing node then resolves to its
    // manifest-gap shape: no prop children, no snippet, rendersForTarget false --
    // proving the target flows through the dispatch rather than being ignored.
    const faceted: RegistryItem = {
      name: 'button',
      type: 'ui',
      primitives: [],
      files: [],
      rules: [],
      composites: [],
      facets: {
        astro: { props: { variant: { type: 'enum', values: ['solid'] } }, snippet: '<b/>' },
      },
    };
    const { handler } = fixtureHandler([], null, [faceted]);
    const node = JSON.parse(
      (await handler.handleToolCall('rafters_describe', { address: 'button' })).content[0]
        .text as string,
    );
    expect(node.children).not.toContainEqual({ addr: 'button.props.variant', type: 'enum' });
    expect(node.snippet).toBeUndefined();
    expect(node.rendersForTarget).toBe(false);
  });
});

describe('lazy, cached, per-workspace graph', () => {
  const a = { name: 'a', root: '/repo/sites/a' };
  const b = { name: 'b', root: '/repo/sites/b' };

  it('builds once per workspace and caches thereafter', async () => {
    const { handler, calls } = fixtureHandler([a, b], a);

    await handler.handleToolCall('rafters_describe', { address: 'button' });
    expect(calls[a.root]).toBe(1);
    // A second call to the same workspace does not re-fetch.
    await handler.handleToolCall('rafters_describe', { address: 'container' });
    expect(calls[a.root]).toBe(1);

    // The other workspace was never fetched until its own first call.
    expect(calls[b.root]).toBeUndefined();
    await handler.handleToolCall('rafters_describe', { address: 'button', workspace: 'b' });
    expect(calls[b.root]).toBe(1);
    await handler.handleToolCall('rafters_describe', { address: 'container', workspace: 'b' });
    expect(calls[b.root]).toBe(1);
  });
});

describe('rafters_generate', () => {
  it('resolves a bare component id directly, bypassing the intent door entirely', async () => {
    const { handler } = fixtureHandler([], null); // no config -> ctx.target undefined
    const result = await handler.handleToolCall('rafters_generate', { intent: 'button' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('button');
    expect(data.error).toContain('no componentTarget is configured');
  });

  it('strips leading filler before the direct lookup ("give me a button" / "a container")', async () => {
    const { handler } = fixtureHandler([], null);
    const a = await handler.handleToolCall('rafters_generate', { intent: 'give me a button' });
    const b = await handler.handleToolCall('rafters_generate', { intent: 'a container' });
    expect(JSON.parse(a.content[0].text as string).error).toContain('button');
    expect(JSON.parse(b.content[0].text as string).error).toContain('container');
  });

  it('falls back to the intent door for a semantic query with no direct id match', async () => {
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_generate', {
      intent: 'what do I use when it needs to be above everything',
    });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('modal');
  });

  it('a filler-stripping phrasing on the same semantic axis still routes via matchIntent using the ORIGINAL string, not the stripped candidate', async () => {
    const { handler } = fixtureHandler([], null);
    // "i need " strips to "something that sits on top of everything else" --
    // not a real node id, so this MUST fall to matchIntent, which is called
    // with the untouched original sentence.
    const result = await handler.handleToolCall('rafters_generate', {
      intent: 'I need something that sits on top of everything else',
    });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('modal');
  });

  it('flat-refuses a query matching neither tier', async () => {
    const { handler } = fixtureHandler([], null);
    for (const intent of ['something that does not exist', 'a login form']) {
      const result = await handler.handleToolCall('rafters_generate', { intent });
      const data = JSON.parse(result.content[0].text as string);
      expect(data).toEqual({ error: 'no registry component matches this query' });
    }
  });

  it('a real composite id typed directly is excluded from the direct tier and falls to the generic refusal', async () => {
    const { handler } = fixtureHandler([], null); // FIXTURE includes node('login-form', 'composite')
    const result = await handler.handleToolCall('rafters_generate', { intent: 'login-form' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toEqual({ error: 'no registry component matches this query' });
  });

  it('refuses a matchIntent-routed composite by name -- v1 serves components only', async () => {
    const items = [node('modal', 'composite'), node('alert', 'ui'), node('tooltip', 'ui')];
    const { handler } = fixtureHandler([], null, items);
    const result = await handler.handleToolCall('rafters_generate', {
      intent: 'what do I use when it needs to be above everything',
    });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('modal');
    expect(data.error).toContain('composite');
  });

  it('builds the graph on first call (unlike the prior stub)', async () => {
    const { handler, calls } = fixtureHandler([], null);
    await handler.handleToolCall('rafters_generate', { intent: 'something that does not exist' });
    expect(calls['']).toBe(1);
  });

  it('surfaces a structured error (not a throw) when the graph is broken', async () => {
    const broken = [node('modal', 'ui', ['does-not-exist'])];
    const { handler } = fixtureHandler([], null, broken);
    const result = await handler.handleToolCall('rafters_generate', { intent: 'modal' });
    expect(JSON.parse(result.content[0].text as string).error).toMatch(
      /failed to build intel graph/,
    );
  });
});

describe('deprecated aliases', () => {
  it('rafters_component forwards by-id to describe and is marked deprecated', async () => {
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_component', { name: 'button' });
    expect(JSON.parse(result.content[0].text as string)).toMatchObject({
      id: 'button',
      deprecated: 'use rafters_describe instead',
    });
  });

  it('rafters_composite forwards by-id to describe and is marked deprecated', async () => {
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_composite', { id: 'login-form' });
    expect(JSON.parse(result.content[0].text as string)).toMatchObject({
      id: 'login-form',
      kind: 'composite',
      deprecated: 'use rafters_describe instead',
    });
  });

  it('rafters_pattern keeps its composite-search body and never calls the intent door', async () => {
    const matchSpy = vi.spyOn(intent, 'matchIntent');
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_pattern', { solves: 'authentication' });
    expect(JSON.parse(result.content[0].text as string)).toMatchObject({
      deprecated: 'use rafters_describe instead',
    });
    expect(matchSpy).not.toHaveBeenCalled();
    matchSpy.mockRestore();
  });

  it('rafters_composite query search surfaces per-block rules (blockRules coverage)', async () => {
    registerComposite({
      manifest: {
        id: 'rules-fixture-login',
        name: 'Rules Fixture Login',
        category: 'forms',
        description: 'Fixture exercising block-level rules in the MCP response.',
        keywords: ['fixture'],
        cognitiveLoad: 1,
      },
      input: [],
      output: [],
      blocks: [
        { id: 'email', type: 'input', rules: ['email', 'required'] },
        { id: 'pw', type: 'input', rules: ['password'] },
        { id: 'submit', type: 'button' },
      ],
    });

    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_composite', { query: 'fixture' });
    const data = JSON.parse(result.content[0].text as string);
    const composite = data.composites.find((c: { id: string }) => c.id === 'rules-fixture-login');
    expect(composite).toBeDefined();
    expect(composite.blockRules).toEqual([
      { id: 'email', type: 'input', rules: ['email', 'required'] },
      { id: 'pw', type: 'input', rules: ['password'] },
    ]);
    expect(data.deprecated).toBe('use rafters_describe instead');
  });
});

describe('rafters_workspaces (unchanged)', () => {
  it('returns the empty list and null default when nothing is configured', async () => {
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('rafters_workspaces', {});
    const data = JSON.parse(result.content[0].text as string);
    expect(data.workspaces).toEqual([]);
    expect(data.defaultWorkspace).toBeNull();
  });

  it('lists every workspace with its default flag', async () => {
    const a = { name: 'a', root: '/repo/sites/a' };
    const b = { name: 'b', root: '/repo/sites/b' };
    const { handler } = fixtureHandler([a, b], a);
    const result = await handler.handleToolCall('rafters_workspaces', {});
    const data = JSON.parse(result.content[0].text as string);
    expect(data.workspaces).toEqual([
      { name: 'a', root: '/repo/sites/a', isDefault: true },
      { name: 'b', root: '/repo/sites/b', isDefault: false },
    ]);
    expect(data.defaultWorkspace).toBe('a');
  });

  it('rejects designer-owned keys with a pointer to Studio', async () => {
    const a = { name: 'a', root: '/repo/sites/a' };
    const { handler } = fixtureHandler([a], a);
    const result = await handler.handleToolCall('rafters_workspaces', {
      workspace: 'a',
      intent: 'playful',
    });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toMatch(/intent/);
    expect(data.error).toMatch(/Studio/);
  });

  it('rejects installed with a pointer to `rafters add`', async () => {
    const a = { name: 'a', root: '/repo/sites/a' };
    const { handler } = fixtureHandler([a], a);
    const result = await handler.handleToolCall('rafters_workspaces', {
      workspace: 'a',
      installed: { components: [] },
    });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toMatch(/rafters add/);
  });
});

describe('workspace routing', () => {
  it('returns a workspace-required error when the named workspace is unknown', async () => {
    const a = { name: 'a', root: '/repo/sites/a' };
    const { handler } = fixtureHandler([a], a);
    const result = await handler.handleToolCall('rafters_describe', {
      address: 'button',
      workspace: 'does-not-exist',
    });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toBe('workspace parameter required');
    expect(data.workspaces).toEqual([{ name: 'a', root: '/repo/sites/a' }]);
  });

  it('deprecated rafters_composite search still guards an unknown workspace', async () => {
    // The by-id forward moved above the resolve guard; the query/category search
    // path must still reject an unnamed-but-unknown workspace.
    const a = { name: 'a', root: '/repo/sites/a' };
    const { handler } = fixtureHandler([a], a);
    const result = await handler.handleToolCall('rafters_composite', {
      query: 'anything',
      workspace: 'does-not-exist',
    });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toBe('workspace parameter required');
  });
});

describe('unknown tool', () => {
  it('returns an error naming the available tools', async () => {
    const { handler } = fixtureHandler([], null);
    const result = await handler.handleToolCall('unknown_tool', {});
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('Unknown tool');
    expect(data.suggestion).toContain('rafters_describe');
  });
});

async function malformedConfigWorkspace(installed: Record<string, unknown>): Promise<{
  root: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(join(tmpdir(), 'rafters-mcp-'));
  await mkdir(join(root, '.rafters'), { recursive: true });
  await writeFile(
    join(root, '.rafters', 'config.rafters.json'),
    JSON.stringify({ framework: 'next', installed }),
  );
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

describe('overlayContext malformed config guard', () => {
  it('rafters_describe returns a structured error (not a throw) when installed.components is not an array', async () => {
    const { root, cleanup } = await malformedConfigWorkspace({ components: 'button' });
    const { handler } = fixtureHandler([{ name: 'fixture', root }], { name: 'fixture', root });
    const result = await handler.handleToolCall('rafters_describe', { address: 'button' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('config.rafters.json');
    expect(data.error).toContain('installed.components');
    await cleanup();
  });

  it('rafters_generate returns the same structured error when installed.primitives is not an array', async () => {
    const { root, cleanup } = await malformedConfigWorkspace({ primitives: { bad: true } });
    const { handler } = fixtureHandler([{ name: 'fixture', root }], { name: 'fixture', root });
    const result = await handler.handleToolCall('rafters_generate', { intent: 'button' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('config.rafters.json');
    expect(data.error).toContain('installed.primitives');
    await cleanup();
  });

  it('the deprecated rafters_component alias returns the same structured error, still marked deprecated, when installed.composites is not an array', async () => {
    const { root, cleanup } = await malformedConfigWorkspace({ composites: 42 });
    const { handler } = fixtureHandler([{ name: 'fixture', root }], { name: 'fixture', root });
    const result = await handler.handleToolCall('rafters_component', { name: 'button' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('installed.composites');
    expect(data.deprecated).toBeDefined();
    await cleanup();
  });

  it('a config with valid installed arrays is unaffected', async () => {
    const { root, cleanup } = await malformedConfigWorkspace({ components: ['button'] });
    const { handler } = fixtureHandler([{ name: 'fixture', root }], { name: 'fixture', root });
    const result = await handler.handleToolCall('rafters_describe', { address: 'button' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toMatchObject({ id: 'button', presence: 'installed' });
    await cleanup();
  });

  it('a workspace with no config file at all is unaffected -- degrades to nothing-installed, not an error', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rafters-mcp-'));
    const { handler } = fixtureHandler([{ name: 'fixture', root }], { name: 'fixture', root });
    const result = await handler.handleToolCall('rafters_describe', { address: 'button' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toMatchObject({ id: 'button', presence: 'available' });
    await rm(root, { recursive: true, force: true });
  });
});
