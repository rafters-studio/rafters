/**
 * rafters studio
 *
 * A local Vite dev server for designers. Its API is one call: POST
 * /__rafters/set { name, value?, why } runs the registry's set, saves the
 * token files and regenerates rafters.css, then tells the page over Vite's
 * HMR channel. rafters is never installed into the project: this runs
 * through `pnpm dlx rafters studio`.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadRegistryFromDir,
  REGISTRY_PLUGINS,
  saveRegistryToDir,
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
    plugins: [studioApi(registry, paths.tokens, regenerate)],
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
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
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
          try {
            if (parsed.value === undefined) {
              registry.set(parsed.name);
            } else {
              registry.set(parsed.name, parsed.value, { reason: parsed.why ?? '' });
            }
          } catch (error) {
            return sendJson(res, 400, { error: (error as Error).message });
          }
          saveRegistryToDir(tokensDir, registry);
          await regenerate();
          server.ws.send({ type: 'custom', event: 'rafters:css-updated' });
          sendJson(res, 200, { token: registry.get(parsed.name) ?? null });
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

interface SetBody {
  name: string;
  value?: Token['value'];
  why?: string;
}

function parseSetBody(body: unknown): SetBody | string {
  if (!body || typeof body !== 'object') return 'body must be an object';
  const { name, value, why } = body as Record<string, unknown>;
  if (typeof name !== 'string' || name.length === 0) return 'name is required';
  if (why !== undefined && typeof why !== 'string') return 'why must be a string';
  return {
    name,
    ...(value !== undefined ? { value: value as Token['value'] } : {}),
    ...(why !== undefined ? { why } : {}),
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
