/**
 * Steps for `rafters studio` (#2846, #2859, #2865).
 *
 * Note: Module-level state is intentional for playwright-bdd step state sharing.
 * Parallel execution is disabled in playwright.config.ts to ensure test isolation.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SCALE_POSITIONS } from '@rafters/color-utils';
import { STUDIO_ERROR_CODES } from '@rafters/shared';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { context } from './common.steps.js';
import { execRafters, startRafters } from './helpers.js';

const { When, Then, After } = createBdd();

const PORT = 7790;
export const STUDIO_URL = `http://127.0.0.1:${PORT}`;
const BASE = STUDIO_URL;

const state: { stop?: () => void; status: number; body: unknown; cssBefore: number } = {
  status: 0,
  body: null,
  cssBefore: 0,
};

function raftersPath(...parts: string[]): string {
  return join(context.fixturePath, '.rafters', ...parts);
}

async function send(
  method: 'POST' | 'DELETE',
  body: unknown,
  headers: Record<string, string>,
): Promise<void> {
  const res = await fetch(`${BASE}/__rafters/set`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  state.status = res.status;
  const text = await res.text();
  try {
    state.body = JSON.parse(text);
  } catch {
    state.body = text;
  }
}

const postSet = (body: unknown, headers: Record<string, string>) => send('POST', body, headers);

const json = { 'Content-Type': 'application/json' };

After(() => {
  state.stop?.();
  state.stop = undefined;
});

/** Starts Studio on the test port in the current fixture; the After hook stops it. */
export async function startStudio(): Promise<void> {
  state.cssBefore = statSync(raftersPath('output', 'rafters.css')).mtimeMs;
  const server = await startRafters(context.fixturePath, [
    'studio',
    '--port',
    String(PORT),
    '--agent',
  ]);
  state.stop = server.stop;
  await server.waitForReady();
}

When('Studio is started', startStudio);

Then('the Studio lockfile names its pid, port and url', () => {
  const lock = JSON.parse(readFileSync(raftersPath('studio.json'), 'utf8'));
  expect(lock.port).toBe(PORT);
  expect(lock.url).toBe(BASE);
  expect(typeof lock.pid).toBe('number');
});

Then('running "rafters studio" again reports the running url', async () => {
  const result = await execRafters(context.fixturePath, ['studio', '--agent']);
  expect(result.stdout).toContain('studio:running');
  expect(result.stdout).toContain(BASE);
});

When(
  'Studio sets {string} to {string} because {string}',
  async ({}, name: string, value: string, why: string) => {
    await postSet({ name, value, why }, json);
  },
);

When(
  'Studio creates the colour {string} from {string} with utilities because {string}',
  async ({}, name: string, value: string, why: string) => {
    await postSet({ name, value, why, utilities: true }, json);
  },
);

When(
  'Studio points {string} at {string} {string} because {string}',
  async ({}, name: string, family: string, position: string, why: string) => {
    await postSet({ name, value: { family, position }, why }, json);
  },
);

When('Studio sets {string} to {string} with no why', async ({}, name: string, value: string) => {
  await postSet({ name, value }, json);
});

When('Studio undoes {string}', async ({}, name: string) => {
  await postSet({ name }, json);
});

When('a page at {string} posts a set', async ({}, origin: string) => {
  await postSet({ name: 'spacing-base' }, { ...json, Origin: origin });
});

When('a set is posted as text\\/plain', async () => {
  await postSet({ name: 'spacing-base' }, { 'Content-Type': 'text/plain' });
});

When('Studio deletes {string} because {string}', async ({}, name: string, why: string) => {
  await send('DELETE', { name, why }, json);
});

When('Studio deletes {string} with no why', async ({}, name: string) => {
  await send('DELETE', { name }, json);
});

When('a page at {string} sends a delete', async ({}, origin: string) => {
  await send('DELETE', { name: 'spacing-base', why: 'x' }, { ...json, Origin: origin });
});

When('a delete is sent as text\\/plain', async () => {
  await send('DELETE', { name: 'spacing-base', why: 'x' }, { 'Content-Type': 'text/plain' });
});

Then('the response status is {int}', ({}, status: number) => {
  expect(state.status).toBe(status);
});

When(
  'Studio creates the fill {string} reading {string} {string} because {string}',
  async ({}, name: string, family: string, position: string, why: string) => {
    await postSet({ name, value: { foreground: { family, position } }, why }, json);
    expect(state.status).toBe(200);
  },
);

When(
  'the endpoint receives {string} {string} with headers {string} and body {string}',
  async ({}, method: string, path: string, headers: string, body: string) => {
    const res = await fetch(`${BASE}${path}`, { method, headers: JSON.parse(headers), body });
    state.status = res.status;
    state.body = await res.json();
  },
);

/** The refusal's body: { error: { code, message, ...details } }, with no other field. */
function refusal(): { code: unknown; message: unknown; [field: string]: unknown } {
  const { error } = state.body as { error: { code: unknown; message: unknown } };
  return error;
}

Then(
  'the refusal is {int} {string} with details {string}',
  ({}, status: number, code: string, details: string) => {
    const expected = JSON.parse(details) as Record<string, unknown>;
    expect(state.status).toBe(status);
    expect(Object.keys(state.body as object)).toEqual(['error']);
    const error = refusal();
    expect(error.code).toBe(code);
    expect(STUDIO_ERROR_CODES).toContain(error.code);
    expect(typeof error.message === 'string' && error.message.length > 0).toBe(true);
    expect(Object.keys(error).sort()).toEqual(['code', 'message', ...Object.keys(expected)].sort());
    expect(error).toMatchObject(expected);
  },
);

Then('the response error says {string}', ({}, text: string) => {
  expect(refusal().message).toContain(text);
});

const family = (name: string) => [name, ...SCALE_POSITIONS.map((p) => `${name}-${p}`)];

Then('the response lists {string} and its eleven steps as deleted', ({}, name: string) => {
  expect(state.body).toEqual({ deleted: family(name) });
});

Then('the colour token file no longer stores {string} or its steps', ({}, name: string) => {
  const file = JSON.parse(readFileSync(raftersPath('tokens', 'color.rafters.json'), 'utf8'));
  const names = new Set(file.tokens.map((t: { name: string }) => t.name));
  for (const n of family(name)) expect(names.has(n)).toBe(false);
});

function logLines(): Record<string, unknown>[] {
  const text = readFileSync(raftersPath('studio.log'), 'utf8');
  return text
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function logLine(n: number): Record<string, unknown> {
  const line = logLines()[n - 1];
  if (!line) throw new Error(`studio.log has no line ${n}`);
  expect(Number.isNaN(Date.parse(String(line.at)))).toBe(false);
  return line;
}

Then('Studio has written no log', () => {
  expect(existsSync(raftersPath('studio.log'))).toBe(false);
});

Then('the Studio log holds {int} lines', ({}, count: number) => {
  expect(logLines()).toHaveLength(count);
});

Then(
  'Studio log line {int} is a {string} of {string} from {string} to {string} because {string}',
  ({}, n: number, action: string, name: string, before: string, after: string, why: string) => {
    expect(logLine(n)).toMatchObject({ action, name, before, after, why });
    expect(logLine(n)).not.toHaveProperty('tokens');
  },
);

Then(
  'Studio log line {int} is an {string} of {string} from {string} to {string}',
  ({}, n: number, action: string, name: string, before: string, after: string) => {
    expect(logLine(n)).toMatchObject({ action, name, before, after, why: null });
  },
);

Then(
  'Studio log line {int} creates {string} and names its eleven steps',
  ({}, n: number, name: string) => {
    const line = logLine(n);
    expect(line).toMatchObject({
      action: 'set',
      name,
      before: null,
      why: 'brand',
      tokens: family(name),
    });
    expect(line.after).toHaveProperty('scale');
  },
);

Then(
  'Studio log line {int} deletes {string} because {string} and names its eleven steps',
  ({}, n: number, name: string, why: string) => {
    const line = logLine(n);
    expect(line).toMatchObject({ action: 'delete', name, after: null, why, tokens: family(name) });
    expect(line.before).toHaveProperty('scale');
  },
);

function storedValue(name: string): unknown {
  const file = JSON.parse(readFileSync(raftersPath('tokens', 'spacing.rafters.json'), 'utf8'));
  return file.tokens.find((t: { name: string }) => t.name === name)?.value;
}

Then('the stored {string} is {string}', ({}, name: string, value: string) => {
  expect(storedValue(name)).toBe(value);
});

Then('the spacing token file stores {string} as {string}', ({}, name: string, value: string) => {
  expect(storedValue(name)).toBe(value);
});

Then('rafters.css was regenerated after the set', () => {
  expect(statSync(raftersPath('output', 'rafters.css')).mtimeMs).toBeGreaterThan(state.cssBefore);
});

Then('the colour token file stores {string} and its eleven steps', ({}, name: string) => {
  const file = JSON.parse(readFileSync(raftersPath('tokens', 'color.rafters.json'), 'utf8'));
  const names = new Set(file.tokens.map((t: { name: string }) => t.name));
  const family = file.tokens.find((t: { name: string }) => t.name === name);
  expect(family.generateUtilityClass).toBe(true);
  expect(family.userOverride.reason).toBe('brand');
  for (const step of SCALE_POSITIONS) expect(names.has(`${name}-${step}`)).toBe(true);
});

Then(
  'the tokens endpoint shows {string} with its reason and the tokens that read it',
  async ({}, name: string) => {
    const tokens = await (await fetch(`${BASE}/__rafters/tokens`)).json();
    const token = tokens.spacing.find((t: { name: string }) => t.name === name);
    expect(token.override).toEqual({ reason: 'test' });
    expect(token.readBy.length).toBeGreaterThan(0);
  },
);

Then('the status endpoint answers ok', async () => {
  const res = await fetch(`${BASE}/__rafters/status`);
  expect(await res.json()).toEqual({ ok: true });
});
