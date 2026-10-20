/**
 * Steps for `rafters add` leaving token files alone when no token changed (#2799).
 *
 * Note: Module-level state is intentional for playwright-bdd step state sharing.
 * Parallel execution is disabled in playwright.config.ts to ensure test isolation.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { generateNamespaces } from '@rafters/design-tokens';
import { createBdd } from 'playwright-bdd';
import { cleanupFixture, type FixtureType, createFixture } from '../fixtures/projects.js';
import { CARRIED_EASING, RETIRED_DURATION, seedStaleMotion } from '../fixtures/stale-motion.js';
import { context } from './common.steps.js';

const { Given, Then } = createBdd();

type MotionToken = {
  name: string;
  value: unknown;
  generatedAt?: string;
  userOverride: unknown;
};

const CHANGED_TOKEN = 'rafters-duration-fast';

const state: {
  tokenFiles: Map<string, string>;
  stamps: Map<string, string | undefined>;
  generatorValue: unknown;
} = { tokenFiles: new Map(), stamps: new Map(), generatorValue: undefined };

function tokensPath(): string {
  return join(context.fixturePath, '.rafters', 'tokens');
}

function motionPath(): string {
  return join(tokensPath(), 'motion.rafters.json');
}

function readMotion(): { tokens: MotionToken[] } & Record<string, unknown> {
  return JSON.parse(readFileSync(motionPath(), 'utf8'));
}

function motionToken(name: string): MotionToken {
  const token = readMotion().tokens.find((t) => t.name === name);
  if (!token) throw new Error(`No motion token named "${name}"`);
  return token;
}

Given('a {string} project', async ({}, fixture: string) => {
  // The feature's Background has already built a project; replace it.
  if (context.fixturePath) await cleanupFixture(context.fixturePath);
  context.fixturePath = await createFixture(fixture as FixtureType);
});

Given('I have run {string}', async ({}, command: string) => {
  const { execRafters } = await import('./helpers.js');
  const parts = command.split(' ');
  if (parts[0] === 'rafters') parts.shift();
  const result = await execRafters(context.fixturePath, parts);
  expect(result.exitCode).toBe(0);
  state.tokenFiles = new Map(
    readdirSync(tokensPath()).map((entry) => [
      entry,
      readFileSync(join(tokensPath(), entry), 'utf8'),
    ]),
  );
});

Given(
  'one motion token in {string} holds a value the generator does not emit and no userOverride',
  async ({}, file: string) => {
    expect(join(context.fixturePath, file)).toBe(motionPath());
    const motion = readMotion();
    state.stamps = new Map(motion.tokens.map((t) => [t.name, t.generatedAt]));
    const target = motion.tokens.find((t) => t.name === CHANGED_TOKEN);
    if (!target) throw new Error(`No motion token named "${CHANGED_TOKEN}"`);
    state.generatorValue = target.value;
    target.value = '999ms';
    target.userOverride = null;
    writeFileSync(motionPath(), `${JSON.stringify(motion, null, 2)}\n`, 'utf8');
  },
);

Given('{string} is a motion file written by rafters before 0.3.0', async ({}, file: string) => {
  expect(join(context.fixturePath, file)).toBe(motionPath());
  seedStaleMotion(context.fixturePath);
});

Then('every file in {string} is byte for byte what init left', async ({}, dir: string) => {
  const full = join(context.fixturePath, dir);
  const after = new Map(
    readdirSync(full).map((entry) => [entry, readFileSync(join(full, entry), 'utf8')]),
  );
  expect([...after.keys()].sort()).toEqual([...state.tokenFiles.keys()].sort());
  for (const [entry, content] of state.tokenFiles) {
    expect(after.get(entry), entry).toBe(content);
  }
});

Then("that token holds the generator's value", async () => {
  expect(motionToken(CHANGED_TOKEN).value).toEqual(state.generatorValue);
});

Then('every other motion token keeps the generatedAt it had before the run', async () => {
  const tokens = readMotion().tokens;
  expect(tokens.map((t) => t.name).sort()).toEqual([...state.stamps.keys()].sort());
  for (const token of tokens) {
    if (token.name === CHANGED_TOKEN) continue;
    expect(token.generatedAt, token.name).toBe(state.stamps.get(token.name));
  }
});

Then('{string} holds the tokens the current generator emits', async ({}, file: string) => {
  expect(join(context.fixturePath, file)).toBe(motionPath());
  const emitted = generateNamespaces(['motion']).allTokens.map((t) => t.name);
  expect(
    readMotion()
      .tokens.map((t) => t.name)
      .sort(),
  ).toEqual(emitted.sort());
});

Then('each carryable stored override is on its token', async () => {
  const easing = motionToken(CARRIED_EASING.name);
  expect(easing.value).toBe(CARRIED_EASING.value);
  expect(easing.userOverride).toEqual(CARRIED_EASING.userOverride);
  const duration = motionToken('rafters-duration-fast');
  expect(duration.value).toBe(RETIRED_DURATION.value);
  expect(duration.userOverride).toEqual(RETIRED_DURATION.userOverride);
});
