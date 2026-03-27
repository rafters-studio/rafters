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
// In-memory registry (held for the session lifetime)
// =============================================================================

let registry: TokenRegistry | null = null;

/** Get or create the registry. On first call, generates the default 536-token system. */
function getRegistry(): TokenRegistry {
  if (!registry) {
    const result = buildColorSystem();
    registry = result.registry;
  }
  return registry;
}

/** Initialize the registry with tokens (called on startup or load). */
export function initializeRegistry(tokens: Token[]): void {
  registry = new TokenRegistry(tokens);
}

/** Get the raw registry for direct access (used by reset). */
export function getRawRegistry(): TokenRegistry {
  return getRegistry();
}

// =============================================================================
// Getters
// =============================================================================

export const getSystem: AppRouteHandler<typeof routes.getSystem> = (c) => {
  const reg = getRegistry();
  const namespaces = getAvailableNamespaces();
  const allTokens = reg.list();

  return c.json(
    {
      namespaces,
      tokenCount: allTokens.length,
    },
    HttpStatusCodes.OK,
  );
};

export const getAllTokens: AppRouteHandler<typeof routes.getAllTokens> = (c) => {
  const reg = getRegistry();
  const allTokens = reg.list();
  const namespaces = [...new Set(allTokens.map((t) => t.namespace))];

  const byNamespace: Record<string, Token[]> = {};
  for (const ns of namespaces) {
    byNamespace[ns] = reg.list({ namespace: ns });
  }

  return c.json(
    {
      namespaces,
      tokenCount: allTokens.length,
      tokens: byNamespace,
    },
    HttpStatusCodes.OK,
  );
};

export const getNamespace: AppRouteHandler<typeof routes.getNamespace> = (c) => {
  const { namespace } = c.req.valid('param');
  const reg = getRegistry();
  const tokens = reg.list({ namespace });

  if (tokens.length === 0) {
    return c.json(
      { message: `Namespace "${namespace}" not found or empty` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  return c.json(
    {
      namespace,
      tokens,
      count: tokens.length,
    },
    HttpStatusCodes.OK,
  );
};

export const getToken: AppRouteHandler<typeof routes.getToken> = (c) => {
  const { namespace, name } = c.req.valid('param');
  const reg = getRegistry();

  const token = reg.get(name);
  if (!token || token.namespace !== namespace) {
    return c.json(
      { message: `Token "${name}" not found in namespace "${namespace}"` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  const dependsOn = token.dependsOn ?? [];
  const dependents = reg.getDependents(name);
  const generationRule = token.generationRule;
  const hasOverride = token.userOverride !== undefined;

  return c.json(
    {
      token,
      dependsOn,
      dependents,
      generationRule,
      hasOverride,
    },
    HttpStatusCodes.OK,
  );
};

// =============================================================================
// Setters
// =============================================================================

export const setToken: AppRouteHandler<typeof routes.setToken> = async (c) => {
  const { namespace, name } = c.req.valid('param');
  const body = c.req.valid('json');
  const reg = getRegistry();

  const existing = reg.get(name);
  if (!existing || existing.namespace !== namespace) {
    return c.json(
      { message: `Token "${name}" not found in namespace "${namespace}"` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  // Record the override with why-gate
  const previousValue = existing.value;
  const updatedToken: Token = {
    ...existing,
    value: body.value as Token['value'],
    userOverride: {
      previousValue,
      reason: body.reason,
      context: body.context,
    },
  };

  // Collect affected tokens (all dependents in the graph)
  const affected = reg.getDependents(name);

  // Track changes via callback
  reg.setChangeCallback((event) => {
    if (event.type === 'token-changed' && !affected.includes(event.tokenName)) {
      affected.push(event.tokenName);
    }
  });

  await reg.setToken(updatedToken);

  // Clear callback
  reg.setChangeCallback(() => {});

  const result = reg.get(name);

  return c.json(
    {
      token: result ?? updatedToken,
      affected,
    },
    HttpStatusCodes.OK,
  );
};

export const batchSetTokens: AppRouteHandler<typeof routes.batchSetTokens> = async (c) => {
  const body = c.req.valid('json');
  const reg = getRegistry();

  const tokensToSet: Token[] = [];
  for (const update of body.updates) {
    const existing = reg.get(update.name);
    if (!existing) {
      return c.json({ message: `Token "${update.name}" not found` }, HttpStatusCodes.BAD_REQUEST);
    }

    tokensToSet.push({
      ...existing,
      value: update.value as Token['value'],
      userOverride: {
        previousValue: existing.value,
        reason: update.reason,
      },
    });
  }

  const affected: string[] = [];
  reg.setChangeCallback((event) => {
    if (event.type === 'token-changed' && !affected.includes(event.tokenName)) {
      affected.push(event.tokenName);
    }
  });

  await reg.setTokens(tokensToSet);

  reg.setChangeCallback(() => {});

  return c.json(
    {
      updated: tokensToSet.length,
      affected: [...new Set(affected)],
    },
    HttpStatusCodes.OK,
  );
};

export const clearOverride: AppRouteHandler<typeof routes.clearOverride> = async (c) => {
  const { namespace, name } = c.req.valid('param');
  const reg = getRegistry();

  const existing = reg.get(name);
  if (!existing || existing.namespace !== namespace) {
    return c.json(
      { message: `Token "${name}" not found in namespace "${namespace}"` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  if (!existing.userOverride) {
    return c.json(
      { message: `Token "${name}" has no override to clear` },
      HttpStatusCodes.NOT_FOUND,
    );
  }

  await reg.set(name, COMPUTED);

  const restored = reg.get(name);

  return c.json(
    {
      token: restored ?? existing,
      restoredValue: restored?.value ?? existing.value,
    },
    HttpStatusCodes.OK,
  );
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

  // Remove existing tokens in this namespace
  const existing = reg.list({ namespace });
  for (const token of existing) {
    reg.remove(token.name);
  }

  // Regenerate with config overrides
  const config = (body.config ?? {}) as Partial<BaseSystemConfig>;
  const result = generateNamespaces([namespace], config);

  // Add regenerated tokens
  const newTokens = result.byNamespace.get(namespace) ?? [];
  for (const token of newTokens) {
    reg.add(token);
  }

  // Collect affected dependents in other namespaces
  const affected: string[] = [];
  for (const token of newTokens) {
    const dependents = reg.getDependents(token.name);
    affected.push(...dependents);
  }

  return c.json(
    {
      namespace,
      tokenCount: newTokens.length,
      affected: [...new Set(affected)],
    },
    HttpStatusCodes.OK,
  );
};
