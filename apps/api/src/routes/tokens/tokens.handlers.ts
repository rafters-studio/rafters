import { buildColorValue } from '@rafters/color-utils';
import {
  type BaseSystemConfig,
  buildColorSystem,
  generateNamespaces,
  getAvailableNamespaces,
  TokenRegistry,
} from '@rafters/design-tokens';
import { COMPUTED, type Token } from '@rafters/shared';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '@/lib/types';
import type * as routes from './tokens.routes';

// =============================================================================
// Registry
// =============================================================================

let registry: TokenRegistry | null = null;

function getRegistry(): TokenRegistry {
  if (!registry) {
    const result = buildColorSystem();
    registry = result.registry;
  }
  return registry;
}

export function initializeRegistry(tokens: Token[]): void {
  registry = new TokenRegistry(tokens);
}

// =============================================================================
// Getters -- return ALL the data
// =============================================================================

export const getSystem: AppRouteHandler<typeof routes.getSystem> = (c) => {
  const reg = getRegistry();
  const all = reg.list();
  const namespaces = [...new Set(all.map((t) => t.namespace))];
  return c.json({ namespaces, tokenCount: all.length }, HttpStatusCodes.OK);
};

export const getAllTokens: AppRouteHandler<typeof routes.getAllTokens> = (c) => {
  const reg = getRegistry();
  const all = reg.list();
  const namespaces = [...new Set(all.map((t) => t.namespace))];
  const byNs: Record<string, Token[]> = {};
  for (const ns of namespaces) byNs[ns] = reg.list({ namespace: ns });
  return c.json({ namespaces, tokenCount: all.length, tokens: byNs }, HttpStatusCodes.OK);
};

export const getNamespace: AppRouteHandler<typeof routes.getNamespace> = (c) => {
  const { namespace } = c.req.valid('param');
  const reg = getRegistry();
  const tokens = reg.list({ namespace });
  if (tokens.length === 0) {
    return c.json({ message: `Namespace "${namespace}" not found` }, HttpStatusCodes.NOT_FOUND);
  }
  return c.json({ namespace, tokens, count: tokens.length }, HttpStatusCodes.OK);
};

export const getToken: AppRouteHandler<typeof routes.getToken> = (c) => {
  const { namespace, name } = c.req.valid('param');
  const reg = getRegistry();
  const token = reg.get(name);
  if (!token || token.namespace !== namespace) {
    return c.json(
      { message: `Token "${name}" not found in "${namespace}"` },
      HttpStatusCodes.NOT_FOUND,
    );
  }
  return c.json(
    {
      token,
      dependsOn: token.dependsOn ?? [],
      dependents: reg.getDependents(name),
      generationRule: token.generationRule,
      hasOverride: token.userOverride !== undefined,
    },
    HttpStatusCodes.OK,
  );
};

// =============================================================================
// Setters -- value + reason in, API fills the Token shape
// =============================================================================

export const setToken: AppRouteHandler<typeof routes.setToken> = async (c) => {
  const { namespace, name } = c.req.valid('param');
  const { value, reason } = c.req.valid('json');
  const reg = getRegistry();

  const existing = reg.get(name);
  if (!existing || existing.namespace !== namespace) {
    return c.json(
      { message: `Token "${name}" not found in "${namespace}"` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Build the full token value based on namespace
  let tokenValue: Token['value'] = value;

  // Color namespace: if the value looks like OKLCH, build a full ColorValue
  if (
    existing.namespace === 'color' &&
    typeof existing.value === 'object' &&
    existing.value !== null &&
    'scale' in existing.value
  ) {
    // This is a color family token -- value should be built via buildColorValue
    // For now, accept the string value. The studio UI calls /color/build first
    // to get the full ColorValue, then sets that via WebSocket.
    tokenValue = value;
  }

  // Construct the updated token with why-gate
  const updated: Token = {
    ...existing,
    value: tokenValue,
    userOverride: {
      previousValue: existing.value,
      reason,
    },
  };

  await reg.setToken(updated);

  return c.json({ ok: true as const }, HttpStatusCodes.OK);
};

export const clearOverride: AppRouteHandler<typeof routes.clearOverride> = async (c) => {
  const { namespace, name } = c.req.valid('param');
  const reg = getRegistry();

  const existing = reg.get(name);
  if (!existing || existing.namespace !== namespace) {
    return c.json(
      { message: `Token "${name}" not found in "${namespace}"` },
      HttpStatusCodes.NOT_FOUND,
    );
  }
  if (!existing.userOverride) {
    return c.json({ message: `Token "${name}" has no override` }, HttpStatusCodes.NOT_FOUND);
  }

  await reg.set(name, COMPUTED);
  return c.json({ ok: true as const }, HttpStatusCodes.OK);
};

// =============================================================================
// Color -- OKLCH in, full ColorValue out
// =============================================================================

export const buildColor: AppRouteHandler<typeof routes.buildColor> = async (c) => {
  const body = c.req.valid('json');

  try {
    const options: Record<string, unknown> = {};
    if (body.token) options.token = body.token;
    if (body.value) options.value = body.value;
    if (body.use) options.use = body.use;

    const colorValue = buildColorValue(
      body.oklch,
      options as Parameters<typeof buildColorValue>[1],
    );
    return c.json({ ok: true as const, colorValue }, HttpStatusCodes.OK);
  } catch (error) {
    return c.json({ message: `Color build failed: ${String(error)}` }, HttpStatusCodes.BAD_REQUEST);
  }
};

// =============================================================================
// Reset
// =============================================================================

export const resetNamespace: AppRouteHandler<typeof routes.resetNamespace> = (c) => {
  const { namespace } = c.req.valid('param');
  const body = c.req.valid('json');
  const reg = getRegistry();

  const available = getAvailableNamespaces();
  if (!available.includes(namespace)) {
    return c.json(
      { message: `Invalid namespace "${namespace}". Available: ${available.join(', ')}` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  for (const token of reg.list({ namespace })) reg.remove(token.name);

  const config = (body.config ?? {}) as Partial<BaseSystemConfig>;
  const result = generateNamespaces([namespace], config);
  const newTokens = result.byNamespace.get(namespace) ?? [];
  for (const token of newTokens) reg.add(token);

  return c.json({ namespace, tokenCount: newTokens.length }, HttpStatusCodes.OK);
};
