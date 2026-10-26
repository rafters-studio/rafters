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
  TokenInUseError,
  type TokenRegistry,
} from '@rafters/design-tokens';
import type { Token } from '@rafters/shared';
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

function studioApi(
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
        if (req.method !== 'GET') return sendJson(res, 405, { error: 'GET only' });
        sendJson(res, 200, tokensByNamespace(registry.list()));
      });

      server.middlewares.use('/__rafters/set', (req, res) => {
        const method = req.method;
        if (method !== 'POST' && method !== 'DELETE') {
          return sendJson(res, 405, { error: 'POST or DELETE only' });
        }
        const refusal = refuseRequest(req, server);
        if (refusal) return sendJson(res, 403, { error: refusal });

        queue = queue.then(async () => {
          let body: unknown;
          try {
            body = JSON.parse(await readBody(req));
          } catch {
            return sendJson(res, 400, { error: 'body must be JSON' });
          }
          const parsed = parseSetBody(body);
          if (typeof parsed === 'string') return sendJson(res, 400, { error: parsed });
          const action: StudioAction =
            method === 'DELETE' ? 'delete' : parsed.value === undefined ? 'undo' : 'set';
          const before = registry.get(parsed.name)?.value ?? null;
          let touched: readonly string[];
          try {
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
          } catch (error) {
            const status = error instanceof TokenInUseError ? 409 : 400;
            return sendJson(res, status, { error: (error as Error).message });
          }
          if (touched.length === 0) {
            return sendJson(res, 409, {
              error: `Token "${parsed.name}" has no change to undo`,
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
        });
      });
    },
  };
}

/**
 * Only same-origin browser requests (or non-browser clients, which send no
 * Origin) may write, and only as JSON, so a page on another site cannot post
 * here: Vite's CORS middleware only sets headers.
 */
function refuseRequest(req: IncomingMessage, server: ViteDevServer): string | undefined {
  const type = req.headers['content-type'] ?? '';
  if (!type.startsWith('application/json')) return 'Content-Type must be application/json';
  const origin = req.headers.origin;
  if (origin === undefined) return undefined;
  const address = server.httpServer?.address();
  const port = address && typeof address === 'object' ? address.port : undefined;
  const own = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
  return own.includes(origin) ? undefined : `origin ${origin} may not write`;
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

function parseSetBody(body: unknown): SetBody | string {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const { name, value, why, utilities } = body as Record<string, unknown>;
  if (typeof name !== 'string' || name.length === 0) return 'name is required';
  if (why !== undefined && typeof why !== 'string') return 'why must be a string';
  if (utilities !== undefined && typeof utilities !== 'boolean') {
    return 'utilities must be a boolean';
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
