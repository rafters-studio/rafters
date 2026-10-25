/**
 * Steps for `rafters studio` (#2846).
 *
 * Note: Module-level state is intentional for playwright-bdd step state sharing.
 * Parallel execution is disabled in playwright.config.ts to ensure test isolation.
 */

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { context } from './common.steps.js';
import { execRafters, startRafters } from './helpers.js';

const { When, Then, After } = createBdd();

const PORT = 7790;
export const STUDIO_URL = `http://127.0.0.1:${PORT}`;
const BASE = STUDIO_URL;

const state: { stop?: () => void; status: number; cssBefore: number } = {
  status: 0,
  cssBefore: 0,
};

function raftersPath(...parts: string[]): string {
  return join(context.fixturePath, '.rafters', ...parts);
}

async function postSet(body: unknown, headers: Record<string, string>): Promise<void> {
  const res = await fetch(`${BASE}/__rafters/set`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  state.status = res.status;
  await res.text();
}

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

Then('the response status is {int}', ({}, status: number) => {
  expect(state.status).toBe(status);
});

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
