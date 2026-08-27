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

  it('rafters_generate resolves a direct component name and returns its verbatim snippet with open slots', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const config = await readConfig(fixturePath);
    config.componentTarget = 'react';
    await writeFixtureFile(fixturePath, '.rafters/config.rafters.json', JSON.stringify(config));

    const modal: RegistryItem = {
      name: 'modal',
      type: 'ui',
      primitives: [],
      files: [],
      rules: [],
      composites: [],
      facets: {
        react: {
          props: {},
          slots: ['title', 'body'],
          snippet: '<Modal><Modal.Title /><Modal.Body /></Modal>',
        },
      },
    };
    const handler = new RaftersToolHandler(
      [{ name: 'fixture', root: fixturePath }],
      { name: 'fixture', root: fixturePath },
      async () => [modal, node('alert', 'ui'), node('tooltip', 'ui')],
    );

    // Direct tier: bare id, no curated-axis phrasing needed. `modal` has no
    // file on disk in this fixture (init writes config, never components), so
    // presence is 'available' and generate names the install command.
    const direct = await handler.handleToolCall('rafters_generate', { intent: 'give me a modal' });
    expect(JSON.parse(direct.content[0].text as string)).toEqual({
      component: 'modal',
      target: 'react',
      presence: 'available',
      snippet: '<Modal><Modal.Title /><Modal.Body /></Modal>',
      slots: [
        { slot: 'title', ownedBy: 'caller', status: 'open' },
        { slot: 'body', ownedBy: 'caller', status: 'open' },
      ],
      install: 'rafters add modal',
    });

    // Intent-door fallback: same component, reached via the semantic axis.
    const viaIntent = await handler.handleToolCall('rafters_generate', {
      intent: 'what do I use when it needs to be above everything',
    });
    expect(JSON.parse(viaIntent.content[0].text as string)).toEqual({
      component: 'modal',
      target: 'react',
      presence: 'available',
      snippet: '<Modal><Modal.Title /><Modal.Body /></Modal>',
      slots: [
        { slot: 'title', ownedBy: 'caller', status: 'open' },
        { slot: 'body', ownedBy: 'caller', status: 'open' },
      ],
      install: 'rafters add modal',
    });
  }, 30000);

  it('names the component and the target when the resolved component has no facet for it', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const config = await readConfig(fixturePath);
    config.componentTarget = 'astro';
    await writeFixtureFile(fixturePath, '.rafters/config.rafters.json', JSON.stringify(config));

    const modal: RegistryItem = {
      name: 'modal',
      type: 'ui',
      primitives: [],
      files: [],
      rules: [],
      composites: [],
      facets: { react: { props: {}, snippet: '<Modal />' } }, // no astro facet
    };
    const handler = new RaftersToolHandler(
      [{ name: 'fixture', root: fixturePath }],
      { name: 'fixture', root: fixturePath },
      async () => [modal, node('alert', 'ui'), node('tooltip', 'ui')],
    );

    const result = await handler.handleToolCall('rafters_generate', { intent: 'modal' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data.error).toContain('modal');
    expect(data.error).toContain('astro');
  }, 30000);

  it('returns slots: [] when the resolved facet declares no content slots', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const config = await readConfig(fixturePath);
    config.componentTarget = 'react';
    await writeFixtureFile(fixturePath, '.rafters/config.rafters.json', JSON.stringify(config));

    const button: RegistryItem = {
      name: 'button',
      type: 'ui',
      primitives: [],
      files: [],
      rules: [],
      composites: [],
      facets: { react: { props: {}, snippet: '<Button />' } }, // no slots on the facet
    };
    const handler = new RaftersToolHandler(
      [{ name: 'fixture', root: fixturePath }],
      { name: 'fixture', root: fixturePath },
      async () => [button],
    );

    const result = await handler.handleToolCall('rafters_generate', { intent: 'button' });
    expect(JSON.parse(result.content[0].text as string)).toEqual({
      component: 'button',
      target: 'react',
      presence: 'available',
      snippet: '<Button />',
      slots: [],
      install: 'rafters add button',
    });
  }, 30000);

  it('deprecated rafters_component forwards by-id and is marked', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');
    const handler = handlerFor(fixturePath);

    const result = await handler.handleToolCall('rafters_component', { name: 'button' });
    const data = JSON.parse(result.content[0].text as string);
    expect(data).toMatchObject({ id: 'button', deprecated: 'use rafters_describe instead' });
  }, 30000);

  it('folds a primitive file on disk into the component set for presence, proving disk beats config', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');

    // `classy` (a primitive) is present on disk under the framework's
    // primitivesPath ('lib/primitives' for next) -- never recorded in
    // config.installed. A primitive-kind item resolves to graph kind
    // `component`, so without the fold it would misreport as `available`;
    // the fold makes it read `installed` from the file alone, with no config
    // entry at all.
    await writeFixtureFile(fixturePath, 'lib/primitives/classy.ts', '');

    // `button` is the OLD premise this change replaces: listed in
    // config.installed but with no file on disk. Trusting the config record
    // would report it installed; measuring disk must report it available.
    const config = await readConfig(fixturePath);
    config.installed = { components: ['button'] };
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
    // On disk, no config entry: installed. Proves the fold reads the primitive
    // scan itself, not a config record.
    expect(byId.get('classy')).toBe('installed');
    // In config.installed, no file on disk: available. Proves presence is
    // measured from disk, not remembered from config.
    expect(byId.get('button')).toBe('available');
  }, 30000);

  it('threads the workspace componentTarget through the dispatch into describe', async () => {
    fixturePath = await createInitializedFixture('nextjs-shadcn-v4');

    // Configure the workspace target on disk, then inject a catalog whose button
    // carries two differing per-target facets. The full chain -- config
    // componentTarget -> overlayContext -> describeWithOverlay -> describe -- must
    // apply the astro facet, not react's.
    const config = await readConfig(fixturePath);
    config.componentTarget = 'astro';
    await writeFixtureFile(fixturePath, '.rafters/config.rafters.json', JSON.stringify(config));

    const button: RegistryItem = {
      name: 'button',
      type: 'ui',
      primitives: [],
      files: [],
      rules: [],
      composites: [],
      facets: {
        astro: {
          props: { variant: { type: 'enum', values: ['solid', 'ghost'] } },
          snippet: '<Button variant="solid" />',
        },
        react: {
          props: { intent: { type: 'enum', values: ['primary', 'danger'] } },
          snippet: '<Button intent="primary" />',
        },
      },
    };
    const handler = new RaftersToolHandler(
      [{ name: 'fixture', root: fixturePath }],
      { name: 'fixture', root: fixturePath },
      async () => [button],
    );

    const node = JSON.parse(
      (await handler.handleToolCall('rafters_describe', { address: 'button' })).content[0]
        .text as string,
    );
    // The astro facet is applied: its prop child + snippet, never react's.
    expect(node.children).toContainEqual({ addr: 'button.props.variant', type: 'enum' });
    expect(node.children).not.toContainEqual({ addr: 'button.props.intent', type: 'enum' });
    expect(node.snippet).toBe('<Button variant="solid" />');
    expect(node.target).toBe('astro');
    expect(node.rendersForTarget).toBe(true);

    // The prop drill also resolves through the astro facet.
    const variant = JSON.parse(
      (await handler.handleToolCall('rafters_describe', { address: 'button.props.variant' }))
        .content[0].text as string,
    );
    expect(variant).toMatchObject({ type: 'enum', values: ['solid', 'ghost'] });
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
