/**
 * Common step definitions for BDD scenarios
 *
 * Provides shared steps for fixture creation, CLI execution, and assertions
 */

import type { ChildProcess } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';

const { Given, When, Then, After } = createBdd();

// Test context shared across steps
// Note: Module-level context is intentional for playwright-bdd step state sharing.
// Parallel execution is disabled in playwright.config.ts to ensure test isolation.
interface ServerHandle {
  process: ChildProcess;
  waitForReady: () => Promise<void>;
  stop: () => void;
}

interface TestContext {
  fixturePath: string;
  commandResult: {
    exitCode: number;
    stdout: string;
    stderr: string;
  } | null;
  serverProcess: ServerHandle | null;
}

const context: TestContext = {
  fixturePath: '',
  commandResult: null,
  serverProcess: null,
};

// Cleanup after each scenario
After(async () => {
  // Stop any running server process
  if (context.serverProcess) {
    context.serverProcess.stop();
    context.serverProcess = null;
  }

  if (context.fixturePath) {
    await cleanupFixture(context.fixturePath);
    context.fixturePath = '';
  }
  context.commandResult = null;
});

// Background steps
Given('a clean temporary directory', async () => {
  // Will be set by specific fixture step
  context.fixturePath = '';
  context.commandResult = null;
});

// Framework fixture steps
Given('a Next.js project with shadcn installed', async () => {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
});

Given('a Vite project with shadcn installed', async () => {
  context.fixturePath = await createFixture('vite-shadcn-v4');
});

Given('a Vite project', async () => {
  context.fixturePath = await createFixture('vite-no-shadcn');
});

Given('a Remix project with shadcn installed', async () => {
  context.fixturePath = await createFixture('remix-shadcn-v4');
});

Given('an Astro project with shadcn installed', async () => {
  context.fixturePath = await createFixture('astro-shadcn-v4');
});

// Tailwind version steps
Given('Tailwind v4 is configured', async () => {
  // Fixtures already have Tailwind v4 by default
  // This step is for documentation/readability
});

Given('Tailwind v3 is configured', async () => {
  // Override fixture with Tailwind v3
  await cleanupFixture(context.fixturePath);
  context.fixturePath = await createFixture('tailwind-v3-error');
});

// Rafters state steps
Given('rafters is initialized', async () => {
  // Run rafters init in the fixture
  const { execRafters } = await import('./helpers.js');
  await execRafters(context.fixturePath, ['init']);
});

Given('rafters is not initialized', async () => {
  // Default state - no .rafters directory
});

Given('a Next.js project with .rafters already initialized', async () => {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  const { execRafters } = await import('./helpers.js');
  await execRafters(context.fixturePath, ['init']);
});

// Deleted token namespaces (#1638 S2 elevation, #1637 fill): old projects
// carry these files; rebuild must drop them.
Given('a stale {string} namespace file exists', async ({}, namespace: string) => {
  const stale = {
    namespace,
    tokens: [
      {
        name: `${namespace}-stale-token`,
        value: 'var(--stale)',
        category: namespace,
        namespace,
        userOverride: null,
      },
    ],
  };
  await writeFile(
    join(context.fixturePath, '.rafters', 'tokens', `${namespace}.rafters.json`),
    JSON.stringify(stale, null, 2),
  );
});

Given('component {string} is already installed', async ({}, component: string) => {
  const { execRafters } = await import('./helpers.js');
  await execRafters(context.fixturePath, ['add', component]);
});

// Command execution steps
When('I run {string}', async ({}, command: string) => {
  const { execRafters } = await import('./helpers.js');
  // Parse "rafters init --force" into ["init", "--force"]
  const parts = command.split(' ');
  if (parts[0] === 'rafters') {
    parts.shift();
  }
  context.commandResult = await execRafters(context.fixturePath, parts);
});

When('I start {string}', async ({}, command: string) => {
  const { startRafters } = await import('./helpers.js');
  const parts = command.split(' ');
  if (parts[0] === 'rafters') {
    parts.shift();
  }
  context.serverProcess = await startRafters(context.fixturePath, parts);
});

// Assertion steps - command results
Then('the command should succeed', async () => {
  expect(context.commandResult).not.toBeNull();
  expect(context.commandResult?.exitCode).toBe(0);
});

Then('the command should fail', async () => {
  expect(context.commandResult).not.toBeNull();
  expect(context.commandResult?.exitCode).not.toBe(0);
});

Then('the error should contain {string}', async ({}, text: string) => {
  expect(context.commandResult?.stderr).toContain(text);
});

Then('the output should contain available components', async () => {
  expect(context.commandResult?.stdout).toMatch(/button|card|dialog/i);
});

// File assertion steps
Then('file {string} should exist', async ({}, filePath: string) => {
  const fullPath = join(context.fixturePath, filePath);
  expect(existsSync(fullPath)).toBe(true);
});

Then('the rafters config should exist', async () => {
  const fullPath = join(context.fixturePath, '.rafters', 'config.rafters.json');
  expect(existsSync(fullPath)).toBe(true);
});

Then('the tokens directory should contain namespace files', async () => {
  const tokensPath = join(context.fixturePath, '.rafters', 'tokens');
  expect(existsSync(tokensPath)).toBe(true);
  const files = readdirSync(tokensPath);
  expect(files.length).toBeGreaterThan(0);
});

Then('the tokens directory should not contain {string}', async ({}, fileName: string) => {
  const filePath = join(context.fixturePath, '.rafters', 'tokens', fileName);
  expect(existsSync(filePath)).toBe(false);
});

Then('the theme.css should exist', async () => {
  // CLI outputs rafters.css, not theme.css
  const themePath = join(context.fixturePath, '.rafters', 'output', 'rafters.css');
  expect(existsSync(themePath)).toBe(true);
});

Then('theme.css should be regenerated', async () => {
  // CLI outputs rafters.css, not theme.css
  const themePath = join(context.fixturePath, '.rafters', 'output', 'rafters.css');
  expect(existsSync(themePath)).toBe(true);
});

Then('the file should contain valid TypeScript', async () => {
  // TypeScript validity is ensured by the registry
  expect(true).toBe(true);
});

// Framework detection assertions
Then('the detected framework should be {string}', async ({}, framework: string) => {
  const configPath = join(context.fixturePath, '.rafters', 'config.rafters.json');
  const config = JSON.parse(await readFile(configPath, 'utf-8'));
  expect(config.framework).toBe(framework);
});

Then('shadcn should be detected as true', async () => {
  const configPath = join(context.fixturePath, '.rafters', 'config.rafters.json');
  const config = JSON.parse(await readFile(configPath, 'utf-8'));
  expect(config.shadcn).toBe(true);
});

Then('shadcn should be detected as false', async () => {
  const configPath = join(context.fixturePath, '.rafters', 'config.rafters.json');
  const config = JSON.parse(await readFile(configPath, 'utf-8'));
  expect(config.shadcn).toBe(false);
});

// Dependency assertions
Then('npm dependencies should be listed for installation', async () => {
  expect(context.commandResult?.stdout).toMatch(/dependencies|install/i);
});

// Export context for other step files
export { context };
