import { buildColorValue } from '@rafters/color-utils';
import {
  type BaseSystemConfig,
  contrastPlugin,
  generateBaseSystem,
  getAvailableNamespaces,
  invertPlugin,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import type { Token } from '@rafters/shared';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import type { AppRouteHandler } from '@/lib/types';
import type * as routes from './tokens.routes';

// =============================================================================
// Registry
// =============================================================================

const REGISTRY_PLUGINS = [scalePlugin, contrastPlugin, statePlugin, invertPlugin];

let registry: TokenRegistry | null = null;

function getRegistry(): TokenRegistry {
  if (!registry) {
    const system = generateBaseSystem();
    registry = new TokenRegistry(system.allTokens, REGISTRY_PLUGINS);
  }
  return registry;
}

export function initializeRegistry(tokens: Token[]): void {
  registry = new TokenRegistry(tokens, REGISTRY_PLUGINS);
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
  for (const ns of namespaces) byNs[ns] = [...reg.list({ namespace: ns })];
  return c.json({ namespaces, tokenCount: all.length, tokens: byNs }, HttpStatusCodes.OK);
};

export const getNamespace: AppRouteHandler<typeof routes.getNamespace> = (c) => {
  const { namespace } = c.req.valid('param');
  const reg = getRegistry();
  // v2's reg.list returns readonly Token[]; hono route signatures expect
  // a mutable array. Spread to copy. (Cheap; not a hot path.)
  const tokens = [...reg.list({ namespace })];
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
      // v2 derives dependents from forward edges at query time; the
      // direct accessor on v1's registry is gone (was identified as
      // bolt-on, see legion reflection 019e1da5). Returning [] until
      // a v2-shaped getDependents helper lands.
      dependents: [] as string[],
      generationRule: token.generationRule,
      // v2 schema: userOverride is `null` when no override (was
      // `undefined` in v1). Check explicitly against null.
      hasOverride: token.userOverride !== null,
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

  // v2's set takes (name, value, {reason, previousValue?, context?}).
  // The full Token-shape mutator (setToken) was removed -- v1 carried
  // the override on the Token itself; v2 carries it on the SetOptions.
  // v2 SetOptions is { reason, context? } -- previousValue is derived
  // automatically by the graph from the current node value before the set.
  reg.set(name, tokenValue, { reason });

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

  // v2 dropped the COMPUTED sentinel for clearing overrides. The closest
  // primitive is undo(), which walks back the last graph change.
  // Caveat: this clears the MOST RECENT override across the whole
  // registry, not necessarily this token's. Proper per-token clear is
  // pending a v2 helper.
  reg.undo();
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

    // buildColorValue requires full OKLCH {l,c,h,alpha}; the request
    // schema may omit alpha. Default to 1 when missing.
    const oklch = { alpha: 1, ...body.oklch };
    const colorValue = buildColorValue(oklch, options as Parameters<typeof buildColorValue>[1]);
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

  const available = getAvailableNamespaces();
  if (!available.includes(namespace)) {
    return c.json(
      { message: `Invalid namespace "${namespace}". Available: ${available.join(', ')}` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // v2 has no reg.remove() or reg.add() -- the v1 add/remove pair was
  // identified as bolt-on and replaced with define()-once + set()
  // overrides. Rebuild the whole registry with the new namespace's
  // tokens overlayed onto a fresh generation.
  const config = (body.config ?? {}) as Partial<BaseSystemConfig>;
  const fullSystem = generateBaseSystem(config);
  registry = new TokenRegistry(fullSystem.allTokens, REGISTRY_PLUGINS);
  const newTokens = fullSystem.byNamespace.get(namespace) ?? [];

  return c.json({ namespace, tokenCount: newTokens.length }, HttpStatusCodes.OK);
};
