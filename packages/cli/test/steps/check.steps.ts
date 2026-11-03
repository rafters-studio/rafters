/**
 * Steps for `rafters check` (#2911).
 *
 * The bin is a stub written into the fixture's node_modules/.bin, so this suite
 * does not depend on @rafters/veneer.
 */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { context } from './common.steps.js';
import { execRafters, snapshot } from './helpers.js';

const { Given, When, Then } = createBdd();

const PACKAGE_DIR = 'packages/site';
const ROOT_BIN_OUTPUT = 'the root bin ran';

/** Install a stub bin in `project` that prints `text` (a JS expression) on both streams. */
async function installStub(project: string, text: string, code = 0): Promise<void> {
  const binDir = join(project, 'node_modules', '.bin');
  await mkdir(binDir, { recursive: true });
  await writeFile(
    join(binDir, 'rafters-check'),
    `#!/usr/bin/env node
const text = ${text};
process.stdout.write(text + '\\n');
process.stderr.write(text + '\\n');
process.exitCode = ${code};
`,
    { mode: 0o755 },
  );
}

Given(
  'a project whose installed rafters-check prints {string} and exits {int}',
  async ({}, output: string, code: number) => {
    context.fixturePath = await mkdtemp(join(tmpdir(), 'rafters-fixture-check-'));
    await installStub(context.fixturePath, JSON.stringify(output), code);
  },
);

Given(
  'a project in {string} whose installed rafters-check prints its arguments',
  async ({}, dir: string) => {
    context.fixturePath = await mkdtemp(join(tmpdir(), 'rafters-fixture-check-'));
    await installStub(join(context.fixturePath, dir), "process.argv.slice(2).join(' ')");
  },
);

Given('a pnpm project with no rafters-check bin', async () => {
  context.fixturePath = await mkdtemp(join(tmpdir(), 'rafters-fixture-check-'));
  await writeFile(join(context.fixturePath, 'package.json'), '{ "name": "site" }\n');
  await writeFile(join(context.fixturePath, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
  context.before = await snapshot(context.fixturePath);
});

Given('a workspace whose root holds the rafters-check bin and whose package does not', async () => {
  context.fixturePath = await mkdtemp(join(tmpdir(), 'rafters-fixture-check-'));
  await writeFile(
    join(context.fixturePath, 'pnpm-workspace.yaml'),
    "packages:\n  - 'packages/*'\n",
  );
  await mkdir(join(context.fixturePath, PACKAGE_DIR), { recursive: true });
  await installStub(context.fixturePath, JSON.stringify(ROOT_BIN_OUTPUT));
});

When('I run {string} in the package', async ({}, command: string) => {
  const args = command.split(' ').slice(1);
  context.commandResult = await execRafters(join(context.fixturePath, PACKAGE_DIR), args);
});

Then('the output holds {string}', async ({}, output: string) => {
  expect(context.commandResult?.stdout).toBe(`${output}\n`);
  expect(context.commandResult?.stderr).toBe(`${output}\n`);
});

Then('the exit code is {int}', async ({}, code: number) => {
  expect(context.commandResult?.exitCode, context.commandResult?.stderr).toBe(code);
});

Then('stderr holds {string}', async ({}, text: string) => {
  expect(context.commandResult?.stderr).toContain(text);
});

Then('no file has changed', async () => {
  expect(await snapshot(context.fixturePath)).toEqual(context.before);
});

Then("the root's bin runs", async () => {
  expect(context.commandResult?.stdout).toBe(`${ROOT_BIN_OUTPUT}\n`);
  expect(context.commandResult?.exitCode, context.commandResult?.stderr).toBe(0);
});
