/**
 * rafters studio
 *
 * A local Vite dev server for designers. Its API is one call: POST
 * /__rafters/set { name, value?, why, utilities? } runs the registry's set, and
 * DELETE /__rafters/set { name, why } its delete; either saves the token files
 * and regenerates rafters.css, tells the page over Vite's HMR channel, and
 * appends a line to .rafters/studio.log. rafters is never installed into the
 * project: this runs through `pnpm dlx rafters studio`.
 */

import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadRegistryFromDir,
  REGISTRY_PLUGINS,
  saveRegistryToDir,
  type TokenRegistry,
} from '@rafters/design-tokens';
import { STUDIO_ERROR_CODES, type StudioErrorCode, type Token } from '@rafters/shared';
import { createServer, type Plugin, type ViteDevServer } from 'vite';
import { DEFAULT_EXPORTS } from '../utils/exports.js';
import { getRaftersPaths } from '../utils/paths.js';
import { log, setAgentMode } from '../utils/ui.js';
import { loadConfig } from './add.js';
import { generateOutputs } from './init.js';

export interface StudioOptions {
  port?: string;
  agent?: boolean;
}

interface StudioLock {
  pid: number;
  port: number;
  url: string;
  startedAt: string;
}

const DEFAULT_PORT = 7777;
const MAX_BODY_BYTES = 1_000_000;

export async function studio(options: StudioOptions): Promise<void> {
  setAgentMode(options.agent ?? false);
  const cwd = process.cwd();
  const paths = getRaftersPaths(cwd);
  const config = await loadConfig(cwd);
  if (!config || !existsSync(paths.tokens)) {
    throw new Error('No .rafters/ found here. Run `pnpm dlx rafters init` first.');
  }

  const lockPath = join(paths.root, 'studio.json');
  const running = readLiveLock(lockPath);
  if (running) {
    log({ event: 'studio:running', url: running.url, pid: running.pid });
    return;
  }

  const registry = loadRegistryFromDir(paths.tokens, REGISTRY_PLUGINS);
  const regenerate = () =>
    generateOutputs(
      cwd,
      paths,
      registry,
      config.exports ?? DEFAULT_EXPORTS,
      config.source,
      'class',
      config,
    );

  const server = await createServer({
    configFile: false,
    root: cwd,
    appType: 'mpa',
    cacheDir: join(tmpdir(), 'rafters-studio-vite'),
    logLevel: 'warn',
    server: {
      // IPv4 loopback, so `localhost` resolving to ::1 on some hosts cannot split
      // the server from its clients; a taken port fails instead of drifting.
      host: '127.0.0.1',
      port: options.port ? Number(options.port) : DEFAULT_PORT,
      strictPort: true,
    },
    plugins: [studioApi(registry, paths.tokens, join(paths.root, 'studio.log'), regenerate)],
  });
  await server.listen();

  const address = server.httpServer?.address();
  const port = address && typeof address === 'object' ? address.port : DEFAULT_PORT;
  const url = `http://127.0.0.1:${port}`;
  const lock: StudioLock = { pid: process.pid, port, url, startedAt: new Date().toISOString() };
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

  const stop = async () => {
    rmSync(lockPath, { force: true });
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  log({ event: 'studio:started', url, pid: process.pid });
}

/** The lock when its process is still alive; a stale lock is removed. */
function readLiveLock(lockPath: string): StudioLock | undefined {
  if (!existsSync(lockPath)) return undefined;
  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as StudioLock;
    process.kill(lock.pid, 0);
    return lock;
  } catch {
    rmSync(lockPath, { force: true });
    return undefined;
  }
}

export function studioApi(
  registry: TokenRegistry,
  tokensDir: string,
  logPath: string,
  regenerate: () => Promise<string[]>,
): Plugin {
  // Writes run one at a time, in the order the requests arrived.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    name: 'rafters:studio-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__rafters/status', (_req, res) => {
        sendJson(res, 200, { ok: true });
      });

      server.middlewares.use('/__rafters/tokens', (req, res) => {
        if (req.method !== 'GET') {
          return refuse(res, 'method-not-allowed', 'GET only', { allowed: ['GET'] });
        }
        sendJson(res, 200, tokensByNamespace(registry.list()));
      });

      server.middlewares.use('/__rafters/set', (req, res) => {
        const method = req.method;
        if (method !== 'POST' && method !== 'DELETE') {
          return refuse(res, 'method-not-allowed', 'POST or DELETE only', {
            allowed: ['POST', 'DELETE'],
          });
        }
        if (refuseRequest(req, res, server)) return;

        // Every throw becomes a refusal, so a failed write never leaves the
        // queue rejected and the writes behind it skipped.
        queue = queue.then(() => write(req, res, method).catch((error) => refuseError(res, error)));
      });

      async function write(
        req: IncomingMessage,
        res: ServerResponse,
        method: 'POST' | 'DELETE',
      ): Promise<void> {
        let body: unknown;
        try {
          body = JSON.parse(await readBody(req));
        } catch {
          return refuse(res, 'body-not-json', 'body must be JSON');
        }
        const parsed = parseSetBody(body);
        if ('field' in parsed) {
          return refuse(res, 'body-invalid', parsed.message, { field: parsed.field });
        }
        const action: StudioAction =
          method === 'DELETE' ? 'delete' : parsed.value === undefined ? 'undo' : 'set';
        const before = registry.get(parsed.name)?.value ?? null;
        let touched: readonly string[];
        if (action === 'delete') {
          touched = registry.delete(parsed.name, { reason: parsed.why ?? '' });
        } else if (parsed.value === undefined) {
          touched = registry.set(parsed.name);
        } else {
          touched = registry.set(parsed.name, parsed.value, {
            reason: parsed.why ?? '',
            ...(parsed.utilities ? { utilities: true } : {}),
          });
        }
        if (touched.length === 0) {
          return refuse(res, 'nothing-to-undo', `Token "${parsed.name}" has no change to undo`, {
            name: parsed.name,
          });
        }
        saveRegistryToDir(tokensDir, registry);
        await regenerate();
        server.ws.send({ type: 'custom', event: 'rafters:css-updated' });
        const token = registry.get(parsed.name);
        appendLog(logPath, {
          at: new Date().toISOString(),
          action,
          name: parsed.name,
          before,
          after: token?.value ?? null,
          why: action === 'undo' ? null : (parsed.why ?? null),
          // More than one name is a colour family and its steps.
          ...(touched.length > 1 ? { tokens: [...touched] } : {}),
        });
        sendJson(res, 200, action === 'delete' ? { deleted: touched } : { token: token ?? null });
      }
    },
  };
}

/**
 * Only same-origin browser requests (or non-browser clients, which send no
 * Origin) may write, and only as JSON, so a page on another site cannot post
 * here: Vite's CORS middleware only sets headers.
 */
function refuseRequest(req: IncomingMessage, res: ServerResponse, server: ViteDevServer): boolean {
  const type = req.headers['content-type'] ?? '';
  if (!type.startsWith('application/json')) {
    refuse(res, 'unsupported-media-type', 'Content-Type must be application/json', {
      expected: 'application/json',
    });
    return true;
  }
  const origin = req.headers.origin;
  if (origin === undefined) return false;
  const address = server.httpServer?.address();
  const port = address && typeof address === 'object' ? address.port : undefined;
  const own = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
  if (own.includes(origin)) return false;
  refuse(res, 'origin-refused', `origin ${origin} may not write`, { origin });
  return true;
}

/** Each code's HTTP status and the detail fields its body carries (#2876). */
const REFUSALS: Record<StudioErrorCode, { status: number; details: readonly string[] }> = {
  'method-not-allowed': { status: 405, details: ['allowed'] },
  'origin-refused': { status: 403, details: ['origin'] },
  'unsupported-media-type': { status: 415, details: ['expected'] },
  'body-not-json': { status: 400, details: [] },
  'body-invalid': { status: 400, details: ['field'] },
  'reason-required': { status: 422, details: ['name', 'action'] },
  'unknown-token': { status: 404, details: ['name'] },
  'token-invalid': { status: 422, details: ['name', 'issues'] },
  'literal-color': { status: 422, details: ['name', 'path'] },
  'name-rejected': { status: 422, details: ['name', 'reason'] },
  'name-taken': { status: 409, details: ['name', 'takenBy'] },
  'token-in-use': { status: 409, details: ['name', 'readers'] },
  'token-undeletable': { status: 409, details: ['name', 'reason'] },
  'circular-dependency': { status: 409, details: ['cycle'] },
  'nothing-to-undo': { status: 409, details: ['name'] },
  'color-out-of-gamut': { status: 422, details: ['requested', 'nearest', 'deltaE', 'limit'] },
  internal: { status: 500, details: [] },
};

function refuse(
  res: ServerResponse,
  code: StudioErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): void {
  sendJson(res, REFUSALS[code].status, { error: { code, message, ...details } });
}

function isStudioErrorCode(code: unknown): code is StudioErrorCode {
  return STUDIO_ERROR_CODES.some((c) => c === code);
}

/**
 * A thrown error's refusal, read from its code and the properties that code
 * names; an error without a Studio code is internal. An error's `name` is its
 * class, so the token's name is read from `tokenName`.
 */
function refuseError(res: ServerResponse, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const fields: Record<string, unknown> =
    error !== null && typeof error === 'object' ? { ...error } : {};
  const code = fields.code;
  if (!isStudioErrorCode(code)) return refuse(res, 'internal', message);
  const details: Record<string, unknown> = {};
  for (const field of REFUSALS[code].details) {
    const value = fields[field === 'name' ? 'tokenName' : field];
    details[field] = field === 'issues' ? issuesOf(value) : value;
  }
  refuse(res, code, message, details);
}

/** A schema error's issues as `{ path, message }`, the path dotted. */
function issuesOf(value: unknown): { path: string; message: string }[] {
  if (!Array.isArray(value)) return [];
  return value.map((issue: unknown) => {
    const { path, message } = (issue ?? {}) as { path?: unknown; message?: unknown };
    return {
      path: Array.isArray(path) ? path.join('.') : '',
      message: typeof message === 'string' ? message : '',
    };
  });
}

type StudioAction = 'set' | 'undo' | 'delete';

interface StudioLogEntry {
  at: string;
  action: StudioAction;
  name: string;
  before: Token['value'] | null;
  after: Token['value'] | null;
  why: string | null;
  tokens?: string[];
}

/** One JSON line per change; the log is only ever appended to. */
function appendLog(logPath: string, entry: StudioLogEntry): void {
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
}

interface SetBody {
  name: string;
  value?: Token['value'];
  why?: string;
  utilities?: boolean;
}

interface BodyInvalid {
  field: string;
  message: string;
}

function parseSetBody(body: unknown): SetBody | BodyInvalid {
  if (!body || typeof body !== 'object')
    return { field: 'body', message: 'body must be an object' };
  const { name, value, why, utilities } = body as Record<string, unknown>;
  if (typeof name !== 'string' || name.length === 0) {
    return { field: 'name', message: 'name is required' };
  }
  if (why !== undefined && typeof why !== 'string') {
    return { field: 'why', message: 'why must be a string' };
  }
  if (utilities !== undefined && typeof utilities !== 'boolean') {
    return { field: 'utilities', message: 'utilities must be a boolean' };
  }
  return {
    name,
    ...(value !== undefined ? { value: value as Token['value'] } : {}),
    ...(why !== undefined ? { why } : {}),
    ...(utilities !== undefined ? { utilities } : {}),
  };
}

interface TokenView {
  name: string;
  value: Token['value'];
  override: { reason: string } | null;
  dependsOn: string[];
  readBy: string[];
}

function tokensByNamespace(tokens: readonly Token[]): Record<string, TokenView[]> {
  const readBy = new Map<string, string[]>();
  for (const token of tokens) {
    for (const dep of token.dependsOn ?? []) {
      const list = readBy.get(dep) ?? [];
      list.push(token.name);
      readBy.set(dep, list);
    }
  }
  const out: Record<string, TokenView[]> = {};
  for (const token of tokens) {
    const list = out[token.namespace] ?? [];
    list.push({
      name: token.name,
      value: token.value,
      override: token.userOverride ? { reason: token.userOverride.reason } : null,
      dependsOn: token.dependsOn ?? [],
      readBy: readBy.get(token.name) ?? [],
    });
    out[token.namespace] = list;
  }
  return out;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}
