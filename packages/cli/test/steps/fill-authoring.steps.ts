/**
 * Steps for authoring fills without the Studio UI (#2832): each change goes
 * through Studio's POST /__rafters/set, and each refusal must carry the
 * message the registry's own validation gives.
 *
 * Note: Module-level state is intentional for playwright-bdd step state sharing.
 * Parallel execution is disabled in playwright.config.ts to ensure test isolation.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistryFromDir, REGISTRY_PLUGINS } from '@rafters/design-tokens';
import type { Token } from '@rafters/shared';
import { expect } from '@playwright/test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createBdd } from 'playwright-bdd';
import { context } from './common.steps.js';
import { EVERY_PART } from './fill-tokens.steps.js';
import { CLI_BIN, execRafters } from './helpers.js';
import { createFixture } from '../fixtures/projects.js';
import { STUDIO_URL, startStudio } from './studio.steps.js';

const { Given, When, Then, After } = createBdd();

const NAME = 'fill-glass';
const GLASS = { foreground: { family: 'zinc', position: '900' } };
const CHANGED = { ...GLASS, border: { token: 'border' } };

interface Attempt {
  name: string;
  value: unknown;
  expected: string;
  named: string;
  status: number;
  error: string;
}

const local: { fileBefore: string; attempts: Attempt[]; mcp?: Client } = {
  fileBefore: '',
  attempts: [],
};

After(async () => {
  await local.mcp?.close();
  local.mcp = undefined;
});

function fillFile(): string {
  return join(context.fixturePath, '.rafters', 'tokens', 'fill.rafters.json');
}

function storedFill(name: string): unknown {
  const file = JSON.parse(readFileSync(fillFile(), 'utf8')) as {
    tokens: { name: string; value: unknown }[];
  };
  return file.tokens.find((t) => t.name === name)?.value;
}

async function set(body: Record<string, unknown>): Promise<{ status: number; error: string }> {
  const res = await fetch(`${STUDIO_URL}/__rafters/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error?: unknown };
  return { status: res.status, error: typeof data.error === 'string' ? data.error : '' };
}

/** The message the registry itself gives for this set, run in-process. */
function registryError(name: string, value: unknown): string {
  const registry = loadRegistryFromDir(
    join(context.fixturePath, '.rafters', 'tokens'),
    REGISTRY_PLUGINS,
  );
  try {
    registry.set(name, value as Token['value'], { reason: 'designer' });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error(`The registry accepted ${name}`);
}

// Givens

Given('an initialised project with a fill', async () => {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  const result = await execRafters(context.fixturePath, ['init', '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
  await startStudio();
  expect((await set({ name: NAME, value: GLASS, why: 'frosted card' })).status).toBe(200);
  expect(storedFill(NAME)).toEqual(GLASS);
});

Given('the rafters MCP server', async () => {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  const result = await execRafters(context.fixturePath, ['init', '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
  const client = new Client({ name: 'fill-authoring-test', version: '0.0.0' });
  await client.connect(
    new StdioClientTransport({ command: 'node', args: [CLI_BIN, 'mcp'], cwd: context.fixturePath }),
  );
  local.mcp = client;
});

// Whens

When(
  "a designer creates a fill with every part of FR-RAF-FILL-001's schema through the non-UI path",
  async () => {
    await startStudio();
    expect((await set({ name: NAME, value: EVERY_PART, why: 'frosted card' })).status).toBe(200);
  },
);

When('a designer changes its recipe through the non-UI path', async () => {
  expect((await set({ name: NAME, value: CHANGED, why: 'add a border' })).status).toBe(200);
});

When('a designer removes it through the non-UI path', async () => {
  expect((await set({ name: NAME })).status).toBe(200);
});

When(
  /^a designer creates or edits a fill with (.+) through the non-UI path$/,
  async ({}, input: string) => {
    local.fileBefore = readFileSync(fillFile(), 'utf8');
    const registry = loadRegistryFromDir(
      join(context.fixturePath, '.rafters', 'tokens'),
      REGISTRY_PLUGINS,
    );
    const colour = registry.list({ namespace: 'color' })[0]?.name;
    if (!colour) throw new Error('The initialised project has no colour');
    const cases: Record<string, { name: string; value: unknown; named: string }[]> = {
      'a literal colour in the recipe': [
        {
          name: NAME,
          value: { ...GLASS, background: { color: 'oklch(0.6 0.1 240)' } },
          named: 'value.background.color',
        },
      ],
      'a name equal to a colour, on the exclude list, or not kebab-case': [
        { name: `fill-${colour}`, value: GLASS, named: `colour "${colour}"` },
        { name: 'fill-cover', value: GLASS, named: 'bg-cover' },
        { name: 'fill-Frosted_Glass', value: GLASS, named: 'kebab-case' },
      ],
    };
    const chosen = cases[input];
    if (!chosen) throw new Error(`No input case for "${input}"`);
    await startStudio();
    local.attempts = [];
    for (const c of chosen) {
      const expected = registryError(c.name, c.value);
      const response = await set({ name: c.name, value: c.value, why: 'designer' });
      local.attempts.push({ ...c, expected, ...response });
    }
  },
);

// Thens

Then('.rafters\\/tokens\\/fill.rafters.json holds the fill as given', async () => {
  expect(storedFill(NAME)).toEqual(EVERY_PART);
});

Then('.rafters\\/tokens\\/fill.rafters.json holds the changed recipe', async () => {
  expect(storedFill(NAME)).toEqual(CHANGED);
});

Then('.rafters\\/tokens\\/fill.rafters.json no longer holds it', async () => {
  expect(storedFill(NAME)).toBeUndefined();
});

Then(
  /^it is refused with the error FR-RAF-FILL-001's validation gives, naming (?:the field|the conflict)$/,
  async () => {
    expect(local.attempts.length).toBeGreaterThan(0);
    for (const attempt of local.attempts) {
      expect(attempt.status, attempt.name).toBe(400);
      expect(attempt.error).toBe(attempt.expected);
      expect(attempt.error).toContain(attempt.named);
    }
  },
);

Then('.rafters\\/tokens\\/fill.rafters.json is unchanged', async () => {
  expect(readFileSync(fillFile(), 'utf8')).toBe(local.fileBefore);
});

Then('none of its tools creates, edits or removes a fill', async () => {
  const client = local.mcp;
  if (!client) throw new Error('The MCP server is not running');
  const before = readFileSync(fillFile(), 'utf8');
  const surface = JSON.parse(before).tokens.find((t: { name: string }) =>
    t.name.startsWith('surface-'),
  )?.name;
  if (!surface) throw new Error('The initialised project has no surface fill');
  const { tools } = await client.listTools();
  expect(tools.length).toBeGreaterThan(0);
  // Every listed tool is offered each shape a fill write could take: a new
  // fill, a changed recipe for an existing one, and its removal.
  const writes = [
    { name: NAME, namespace: 'fill', value: GLASS, why: 'designer' },
    { name: surface, namespace: 'fill', value: CHANGED, why: 'designer' },
    { name: surface, namespace: 'fill', remove: true },
  ];
  for (const tool of tools) {
    for (const args of writes) {
      await client.callTool({ name: tool.name, arguments: args }).catch(() => undefined);
    }
  }
  expect(readFileSync(fillFile(), 'utf8')).toBe(before);
});
