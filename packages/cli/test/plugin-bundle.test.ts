import { mkdtemp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const CLI_ROOT = join(REPO_ROOT, 'packages/cli');
const PLUGIN_ROOT = join(REPO_ROOT, 'plugin');
const BUNDLE = join(PLUGIN_ROOT, 'bin/rafters-mcp.bundle.mjs');

// A module-resolution failure is the one thing the single-file bundle must
// never produce -- it is what an uninlinable dependency (the css-tree edge)
// surfaces as. Network failures against the live registry are orthogonal and
// tolerated (the repo's MCP integration tests inject the catalog rather than
// hit https://rafters.studio); this pattern is asserted absent everywhere.
const MODULE_RESOLUTION_ERROR = /Cannot find module|ERR_MODULE_NOT_FOUND|ERR_REQUIRE_ESM/;

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf-8'));
}

describe('plugin bundle', () => {
  beforeAll(async () => {
    await execa('pnpm', ['--filter=rafters', 'build'], { cwd: REPO_ROOT });
  }, 240_000);

  it('produces exactly one bundled file with no chunks', async () => {
    const entries = await readdir(join(PLUGIN_ROOT, 'bin'));
    expect(entries.filter((f) => f.endsWith('.mjs'))).toEqual(['rafters-mcp.bundle.mjs']);
  });

  it('does not reference css-tree, mdn-data, or @tailwindcss/cli', async () => {
    const src = await readFile(BUNDLE, 'utf-8');
    expect(src).not.toContain('css-tree');
    expect(src).not.toContain('mdn-data');
    expect(src).not.toContain('@tailwindcss/cli');
  });

  it('reports the pinned CLI version via --version', async () => {
    const { stdout } = await execa('node', [BUNDLE, '--version']);
    const cliVersion = (await readJson(join(CLI_ROOT, 'package.json'))).version;
    expect(stdout.trim()).not.toBe('0.0.0-unknown');
    expect(stdout.trim()).toBe(cliVersion);
  }, 30_000);

  it('answers a real tools/call against a fixture workspace', async () => {
    // A fixture workspace whose .rafters/config.rafters.json declares an
    // installed component and a react target -- forces the overlay + graph
    // (composite-loading) path that a no-arg rafters_workspaces call skips.
    const fixtureDir = await mkdtemp(join(tmpdir(), 'rafters-plugin-bundle-'));
    await mkdir(join(fixtureDir, '.rafters'), { recursive: true });
    await writeFile(
      join(fixtureDir, '.rafters', 'config.rafters.json'),
      JSON.stringify(
        {
          framework: 'vite',
          componentTarget: 'react',
          componentsPath: 'src/components/ui',
          primitivesPath: 'src/lib/primitives',
          compositesPath: 'src/composites',
          rulesPath: 'src/lib/rules',
          cssPath: 'src/index.css',
          exports: { tailwind: true },
          installed: { components: ['button'], primitives: [], composites: [], rules: [] },
        },
        null,
        2,
      ),
    );

    const requests = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '0.0.0' },
        },
      },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'rafters_describe', arguments: { address: 'button' } },
      },
    ];

    const { stdout, stderr } = await execa('node', [BUNDLE, 'mcp'], {
      input: `${requests.map((r) => JSON.stringify(r)).join('\n')}\n`,
      cwd: fixtureDir,
      reject: false,
      // Generous headroom: the describe path fetches the live catalog, so a slow
      // registry must not truncate stdout and turn `byId(2)` undefined.
      timeout: 60_000,
    });

    // Hard invariant: nothing on the describe path resolves a module at runtime
    // that the single-file bundle failed to inline.
    expect(stderr).not.toMatch(MODULE_RESOLUTION_ERROR);

    const lines = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    const byId = (id: number) =>
      lines.find((l) => l.id === id) as
        | { result?: Record<string, unknown>; error?: unknown }
        | undefined;

    // initialize response carries the pinned version (no network needed).
    const init = byId(1);
    const serverInfo = (init?.result?.serverInfo ?? {}) as { version?: string };
    expect(serverInfo.version).toBeDefined();
    expect(serverInfo.version).not.toBe('0.0.0-unknown');

    // The tools/call response exists, is transport-clean, and never carries a
    // module-resolution error in its (SDK-wrapped) content.
    const call = byId(2);
    expect(call).toBeDefined();
    expect(call?.error).toBeUndefined();
    expect(JSON.stringify(call)).not.toMatch(MODULE_RESOLUTION_ERROR);

    // When the live registry is reachable, the describe path returns a genuine,
    // non-error node. A registry-unreachable run degrades to a structured
    // "failed to build intel graph" error -- tolerated, since it is not a
    // bundling failure and the suite must not depend on live network.
    const result = (call?.result ?? {}) as {
      isError?: boolean;
      content?: Array<{ text?: string }>;
    };
    const text = result.content?.[0]?.text ?? '';
    const registryUnreachable = /failed to build intel graph/.test(text);
    if (!registryUnreachable) {
      expect(result.isError).not.toBe(true);
    }
  }, 90_000);
});

describe('plugin version lockstep', () => {
  it('plugin.json, marketplace.json, and plugin/package.json all match the CLI version', async () => {
    const cliVersion = (await readJson(join(CLI_ROOT, 'package.json'))).version;
    const pluginJson = await readJson(join(PLUGIN_ROOT, '.claude-plugin/plugin.json'));
    const pluginPkg = await readJson(join(PLUGIN_ROOT, 'package.json'));
    const marketplace = await readJson(join(REPO_ROOT, '.claude-plugin/marketplace.json'));
    const entry = (marketplace.plugins as Array<{ name: string; version: string }>).find(
      (p) => p.name === 'rafters',
    );

    expect(pluginJson.version).toBe(cliVersion);
    expect(pluginPkg.version).toBe(cliVersion);
    expect(entry?.version).toBe(cliVersion);
  });
});

describe('mcp/tools.ts config import', () => {
  it('does not import from commands/init.ts', async () => {
    const src = await readFile(join(CLI_ROOT, 'src/mcp/tools.ts'), 'utf-8');
    expect(src).not.toMatch(/from ['"]\.\.\/commands\/init\.js['"]/);
  });
});
