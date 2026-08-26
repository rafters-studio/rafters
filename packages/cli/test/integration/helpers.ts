/**
 * Integration test helpers
 *
 * Provides utilities for executing CLI commands against fixture projects
 * and creating pre-initialized project fixtures.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixture, type FixtureType } from '../fixtures/projects.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLI_BIN = join(__dirname, '../../dist/index.js');

const EXEC_TIMEOUT_MS = 25_000;

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface SpawnOptions {
  /** Kill the child after this many ms. Defaults to EXEC_TIMEOUT_MS. */
  timeoutMs?: number;
}

/**
 * Spawn a process, capture stdout/stderr, and resolve on close.
 * Kills the process after `timeoutMs` to prevent orphaned processes.
 */
function spawnCaptured(
  command: string,
  args: string[],
  cwd: string,
  options: SpawnOptions = {},
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? EXEC_TIMEOUT_MS;
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let stdout = '';
    let stderr = '';

    const killTimer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        exitCode: 1,
        stdout,
        stderr: `${stderr}\nProcess killed after ${timeoutMs}ms timeout`,
      });
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(killTimer);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });

    child.on('error', (err) => {
      clearTimeout(killTimer);
      resolve({ exitCode: 1, stdout, stderr: stderr + err.message });
    });
  });
}

/**
 * Execute rafters CLI command and wait for completion.
 * Kills the process after `timeoutMs` (default 25s) to prevent orphaned processes.
 * Pass a larger `timeoutMs` for commands that perform a real package-manager install.
 */
export async function execCli(
  cwd: string,
  args: string[],
  options: SpawnOptions = {},
): Promise<CommandResult> {
  return spawnCaptured('node', [CLI_BIN, ...args], cwd, options);
}

/**
 * Run the fixture's locally-installed TypeScript compiler (`node_modules/.bin/tsc`).
 * Used to prove that an installed dependency's imports resolve in a fresh consumer.
 */
export async function execTsc(
  cwd: string,
  args: string[],
  options: SpawnOptions = {},
): Promise<CommandResult> {
  const tscBin = join(cwd, 'node_modules', '.bin', 'tsc');
  return spawnCaptured(tscBin, args, cwd, options);
}

/**
 * Create a fixture project and run `rafters init` on it.
 * Returns the fixture path with a fully initialized .rafters/ directory.
 */
export async function createInitializedFixture(
  type: FixtureType = 'nextjs-shadcn-v4',
): Promise<string> {
  const fixturePath = await createFixture(type);
  const result = await execCli(fixturePath, ['init']);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to initialize fixture ${type}: ${result.stderr}\n${result.stdout}`);
  }

  return fixturePath;
}

/**
 * Read and parse the rafters config from a fixture
 */
export async function readConfig(fixturePath: string): Promise<Record<string, unknown>> {
  const configPath = join(fixturePath, '.rafters', 'config.rafters.json');
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Check if a file exists relative to a fixture path
 */
export function fixtureFileExists(fixturePath: string, relativePath: string): boolean {
  return existsSync(join(fixturePath, relativePath));
}

/**
 * Read a file relative to a fixture path
 */
export async function readFixtureFile(fixturePath: string, relativePath: string): Promise<string> {
  return readFile(join(fixturePath, relativePath), 'utf-8');
}

/**
 * Write a file relative to a fixture path
 */
export async function writeFixtureFile(
  fixturePath: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const fullPath = join(fixturePath, relativePath);
  await mkdir(join(fullPath, '..'), { recursive: true });
  await writeFile(fullPath, content);
}
