/**
 * rafters studio
 *
 * Starts an embedded token registry API server.
 * No external dependencies -- runs with Node.js directly.
 * Serves getters, setters (with why-gate), and namespace reset.
 */

import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';
import {
  type BaseSystemConfig,
  NodePersistenceAdapter,
  TokenRegistry,
  buildColorSystem,
  generateNamespaces,
  getAvailableNamespaces,
} from '@rafters/design-tokens';
import { COMPUTED, type Token } from '@rafters/shared';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getRaftersPaths } from '../utils/paths.js';

export async function studio(): Promise<void> {
  const cwd = process.cwd();
  const paths = getRaftersPaths(cwd);

  if (!existsSync(paths.root)) {
    console.error('No .rafters/ directory found. Run "rafters init" first.');
    process.exit(1);
  }

  // Load tokens from project or generate defaults
  const adapter = new NodePersistenceAdapter(cwd);
  let tokens: Token[] = [];
  try {
    tokens = await adapter.load();
  } catch {
    // No tokens yet
  }

  let registry: TokenRegistry;
  if (tokens.length > 0) {
    registry = new TokenRegistry(tokens);
    console.log(`Loaded ${tokens.length} tokens from ${paths.tokens}`);
  } else {
    const result = buildColorSystem();
    registry = result.registry;
    console.log(`Generated ${registry.list().length} default tokens`);
  }

  registry.setAdapter(adapter);

  const app = new Hono();
  app.use('*', cors());

  app.get('/tokens/system', (c) => {
    const all = registry.list();
    const namespaces = [...new Set(all.map((t) => t.namespace))];
    return c.json({ namespaces, tokenCount: all.length });
  });

  app.get('/tokens', (c) => {
    const all = registry.list();
    const namespaces = [...new Set(all.map((t) => t.namespace))];
    const byNs: Record<string, Token[]> = {};
    for (const ns of namespaces) byNs[ns] = registry.list({ namespace: ns });
    return c.json({ namespaces, tokenCount: all.length, tokens: byNs });
  });

  app.get('/tokens/:namespace', (c) => {
    const ns = c.req.param('namespace');
    const t = registry.list({ namespace: ns });
    if (t.length === 0) return c.json({ message: `Namespace "${ns}" not found` }, 404);
    return c.json({ namespace: ns, tokens: t, count: t.length });
  });

  app.get('/tokens/:namespace/:name', (c) => {
    const { namespace, name } = c.req.param();
    const token = registry.get(name);
    if (!token || token.namespace !== namespace) {
      return c.json({ message: `Token "${name}" not found in "${namespace}"` }, 404);
    }
    return c.json({
      token,
      dependsOn: token.dependsOn ?? [],
      dependents: registry.getDependents(name),
      generationRule: token.generationRule,
      hasOverride: token.userOverride !== undefined,
    });
  });

  app.put('/tokens/:namespace/:name', async (c) => {
    const { namespace, name } = c.req.param();
    const body = await c.req.json();
    if (!body.reason || body.reason.trim() === '') {
      return c.json({ message: 'Reason is required. Every change needs a why.' }, 400);
    }
    const existing = registry.get(name);
    if (!existing || existing.namespace !== namespace) {
      return c.json({ message: `Token "${name}" not found in "${namespace}"` }, 404);
    }

    const affected: string[] = [];
    registry.setChangeCallback((event) => {
      if (event.type === 'token-changed' && !affected.includes(event.tokenName)) {
        affected.push(event.tokenName);
      }
    });

    await registry.setToken({
      ...existing,
      value: body.value,
      userOverride: { previousValue: existing.value, reason: body.reason, context: body.context },
    });
    registry.setChangeCallback(() => {});

    return c.json({ token: registry.get(name), affected });
  });

  app.delete('/tokens/:namespace/:name/override', async (c) => {
    const { namespace, name } = c.req.param();
    const existing = registry.get(name);
    if (!existing || existing.namespace !== namespace) {
      return c.json({ message: `Token "${name}" not found in "${namespace}"` }, 404);
    }
    if (!existing.userOverride) {
      return c.json({ message: `Token "${name}" has no override` }, 404);
    }
    await registry.set(name, COMPUTED);
    const restored = registry.get(name);
    return c.json({ token: restored, restoredValue: restored?.value });
  });

  app.post('/tokens/:namespace/reset', async (c) => {
    const ns = c.req.param('namespace');
    const body = await c.req.json().catch(() => ({}));
    const available = getAvailableNamespaces();
    if (!available.includes(ns)) {
      return c.json({ message: `Invalid namespace "${ns}". Available: ${available.join(', ')}` }, 404);
    }
    for (const token of registry.list({ namespace: ns })) registry.remove(token.name);
    const config = (body.config ?? {}) as Partial<BaseSystemConfig>;
    const result = generateNamespaces([ns], config);
    const newTokens = result.byNamespace.get(ns) ?? [];
    for (const token of newTokens) registry.add(token);
    return c.json({ namespace: ns, tokenCount: newTokens.length, affected: [] });
  });

  const port = 8787;
  console.log('Starting Rafters Studio API...');
  console.log(`Project: ${cwd}`);
  console.log(`Tokens: ${paths.tokens}`);
  console.log('');

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Rafters Studio API running on http://localhost:${info.port}`);
  });
}
