/**
 * Studio's refusals that no real request can reach (#2876): a cycle, an
 * out-of-gamut colour (thrown from #2877 on) and an error with no Studio code.
 * The registry is stubbed to throw each; the endpoint is real. The refusals a
 * request can reach are in test/features/studio.feature.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CircularDependencyError, TokenRegistry } from '@rafters/design-tokens';
import { STUDIO_ERROR_CODES } from '@rafters/shared';
import { createServer, type ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { studioApi } from '../../src/commands/studio.js';

class GamutError extends Error {
  readonly code = 'color-out-of-gamut';
  readonly requested = { l: 0.7, c: 0.4, h: 140, alpha: 1 };
  readonly nearest = { l: 0.7, c: 0.2, h: 140, alpha: 1 };
  readonly deltaE = 0.12;
  readonly limit = 0.05;
}

class SystemError extends Error {
  readonly code = 'EACCES';
}

let dir: string;
let registry: TokenRegistry;
let server: ViteDevServer;
let url: string;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'rafters-studio-'));
  registry = new TokenRegistry([
    {
      name: 'spacing-base',
      namespace: 'spacing',
      category: 'spacing',
      value: '0.25rem',
      userOverride: null,
    },
  ]);
  server = await createServer({
    configFile: false,
    root: dir,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [studioApi(registry, dir, join(dir, 'studio.log'), async () => [])],
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address !== 'object') throw new Error('Studio did not listen');
  url = `http://127.0.0.1:${address.port}/__rafters/set`;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await server.close();
  rmSync(dir, { recursive: true, force: true });
});

async function post(body: unknown): Promise<{ status: number; error: Record<string, unknown> }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { error: Record<string, unknown> };
  return { status: res.status, error: data.error };
}

function throwOnSet(error: unknown): void {
  vi.spyOn(registry, 'set').mockImplementation(() => {
    throw error;
  });
}

const SET = { name: 'spacing-base', value: '0.3rem', why: 'test' };

describe('studio refusals a request cannot reach', () => {
  it('reports a cycle as circular-dependency, 409, with the cycle', async () => {
    throwOnSet(new CircularDependencyError(['a', 'b', 'a']));
    const { status, error } = await post(SET);
    expect(status).toBe(409);
    expect(error).toEqual({
      code: 'circular-dependency',
      message: 'Circular dependency: a -> b -> a',
      cycle: ['a', 'b', 'a'],
    });
  });

  it('reports color-out-of-gamut, 422, with requested, nearest, deltaE and limit', async () => {
    const gamut = new GamutError('out of gamut');
    throwOnSet(gamut);
    const { status, error } = await post(SET);
    expect(status).toBe(422);
    expect(error).toEqual({
      code: 'color-out-of-gamut',
      message: 'out of gamut',
      requested: gamut.requested,
      nearest: gamut.nearest,
      deltaE: gamut.deltaE,
      limit: gamut.limit,
    });
  });

  it('reports an error with no code as internal, 500', async () => {
    throwOnSet(new Error('boom'));
    const { status, error } = await post(SET);
    expect(status).toBe(500);
    expect(error).toEqual({ code: 'internal', message: 'boom' });
  });

  it('reports an error whose code is not a Studio code as internal, never that code', async () => {
    throwOnSet(new SystemError('permission denied'));
    const { status, error } = await post(SET);
    expect(status).toBe(500);
    expect(error).toEqual({ code: 'internal', message: 'permission denied' });
    expect(STUDIO_ERROR_CODES).toContain(error.code);
  });

  it('keeps accepting writes after an internal error', async () => {
    throwOnSet(new Error('boom'));
    expect((await post(SET)).status).toBe(500);
    vi.restoreAllMocks();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SET),
    });
    expect(res.status).toBe(200);
    expect(registry.get('spacing-base')?.value).toBe('0.3rem');
  });
});
