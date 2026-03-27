/**
 * Studio Vite Plugin - WebSocket bridge to TokenRegistry
 *
 * Handles two-phase color selection:
 * 1. Instant: color-utils data saved immediately (CSS updates, user sees changes)
 * 2. Complete: API enrichment arrives, save complete ColorValue to disk
 *
 * Use `persist: false` for instant feedback without disk write.
 * Use `persist: true` (default) when enrichment is complete.
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildColorValue } from '@rafters/color-utils';
import { NodePersistenceAdapter, registryToVars, TokenRegistry } from '@rafters/design-tokens';
import { ColorReferenceSchema, ColorValueSchema, OKLCHSchema, TokenSchema } from '@rafters/shared';
import type { Plugin, ViteDevServer } from 'vite';
import { z } from 'zod';

// Response schemas
const TokenResponseSchema = z.object({
  ok: z.literal(true),
  token: TokenSchema,
});

const TokensResponseSchema = z.object({
  tokens: z.array(TokenSchema),
  initialized: z.boolean(),
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

// Color build response schema
const ColorBuildResponseSchema = z.object({
  ok: z.literal(true),
  colorValue: ColorValueSchema,
});

// Schema for color build options
const ColorBuildOptionsSchema = z.object({
  token: z.string().optional(),
  value: z.string().optional(),
  use: z.string().optional(),
  states: z.record(z.string(), z.string()).optional(),
});

const projectPath = process.env.RAFTERS_PROJECT_PATH || process.cwd();
const outputPath = join(projectPath, '.rafters', 'output', 'rafters.vars.css');

// Zod schema for incoming WebSocket messages
const SetTokenMessageSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), ColorValueSchema, ColorReferenceSchema]),
  persist: z.boolean().optional(),
});

// Schema for POST /api/tokens/:name - partial token update
// Derived from TokenSchema: value required, patchable fields optional
export const TokenPatchSchema = TokenSchema.pick({
  value: true,
  trustLevel: true,
  elevationLevel: true,
  motionIntent: true,
  accessibilityLevel: true,
  userOverride: true,
  description: true,
});

// ============================================================================
// Namespace-specific validation schemas
// Each namespace has specific rules for what values and fields are valid
// ============================================================================

// Color namespace: OKLCH strings or ColorValue objects for scale families
const ColorNamespacePatchSchema = z.object({
  value: z.union([
    z.string().regex(/^oklch\(/, 'Color value must be oklch() format'),
    ColorValueSchema,
  ]),
  scalePosition: z.number().min(0).max(10).optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Semantic namespace: ColorReference pointing to color family + position
const SemanticNamespacePatchSchema = z.object({
  value: ColorReferenceSchema,
  trustLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  consequence: z.enum(['reversible', 'significant', 'permanent', 'destructive']).optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Spacing namespace: rem values only
const SpacingNamespacePatchSchema = z.object({
  value: z
    .string()
    .regex(/^-?\d+(\.\d+)?rem$/, 'Spacing value must be rem (e.g., "1rem", "0.25rem")'),
  scalePosition: z.number().min(0).max(12).optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Typography namespace: various string formats
const TypographyNamespacePatchSchema = z.object({
  value: z.string().min(1),
  lineHeight: z.string().optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Breakpoint namespace: px (viewport) or rem (container) values
const BreakpointNamespacePatchSchema = z.object({
  value: z.string().regex(/^\d+(\.\d+)?(px|rem)$/, 'Breakpoint must be px or rem value'),
  viewportAware: z.boolean().optional(),
  containerQueryAware: z.boolean().optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Radius namespace: rem, '0', or '9999px' for pill shapes
const RadiusNamespacePatchSchema = z.object({
  value: z.union([
    z.literal('0'),
    z.literal('9999px'),
    z.string().regex(/^\d+(\.\d+)?rem$/, 'Radius must be rem value, "0", or "9999px"'),
  ]),
  scalePosition: z.number().optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Shadow namespace: CSS shadow strings
const ShadowNamespacePatchSchema = z.object({
  value: z.string().min(1),
  shadowToken: z.string().optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Depth namespace: numeric z-index values
const DepthNamespacePatchSchema = z.object({
  value: z.string().regex(/^-?\d+$/, 'Depth value must be numeric z-index'),
  elevationLevel: z
    .enum(['surface', 'raised', 'overlay', 'sticky', 'modal', 'popover', 'tooltip'])
    .optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Motion namespace: duration (ms) or easing (cubic-bezier)
const MotionNamespacePatchSchema = z.object({
  value: z.union([
    z.string().regex(/^\d+ms$/, 'Duration must be in ms'),
    z.string().regex(/^cubic-bezier\(/, 'Easing must be cubic-bezier()'),
  ]),
  motionIntent: z.enum(['enter', 'exit', 'emphasis', 'transition']).optional(),
  easingName: TokenSchema.shape.easingName,
  reducedMotionAware: z.boolean().optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Elevation namespace: depth via reference or string value
const ElevationNamespacePatchSchema = z.object({
  value: z.string(),
  elevationLevel: z
    .enum(['surface', 'raised', 'overlay', 'sticky', 'modal', 'popover', 'tooltip'])
    .optional(),
  shadowToken: z.string().optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Focus namespace: focus ring properties
const FocusNamespacePatchSchema = z.object({
  value: z.string().min(1),
  focusRingWidth: z.string().optional(),
  focusRingColor: z.string().optional(),
  focusRingOffset: z.string().optional(),
  focusRingStyle: z.string().optional(),
  accessibilityLevel: z.enum(['AA', 'AAA']).optional(),
  description: z.string().optional(),
  userOverride: TokenSchema.shape.userOverride.optional(),
});

// Map namespace to its validation schema
const namespacePatchSchemas: Record<string, z.ZodTypeAny> = {
  color: ColorNamespacePatchSchema,
  semantic: SemanticNamespacePatchSchema,
  spacing: SpacingNamespacePatchSchema,
  typography: TypographyNamespacePatchSchema,
  breakpoint: BreakpointNamespacePatchSchema,
  radius: RadiusNamespacePatchSchema,
  shadow: ShadowNamespacePatchSchema,
  depth: DepthNamespacePatchSchema,
  motion: MotionNamespacePatchSchema,
  elevation: ElevationNamespacePatchSchema,
  focus: FocusNamespacePatchSchema,
};

// Get the appropriate schema for a namespace, falling back to generic TokenPatchSchema
export function getNamespacePatchSchema(namespace: string): z.ZodTypeAny {
  return namespacePatchSchemas[namespace] ?? TokenPatchSchema;
}

// Helper to read request body as JSON with size limit
const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit

function readJsonBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// Handler for POST /api/color/build - builds ColorValue from OKLCH (exported for testing)
export async function handleBuildColor(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
): Promise<void> {
  // Parse request body
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    res.statusCode = 400;
    const message = error instanceof Error ? error.message : 'Invalid JSON body';
    res.end(JSON.stringify({ ok: false, error: message }));
    return;
  }

  // Validate OKLCH input - expect { oklch: { l, c, h }, options?: { token, value, use, states } }
  const inputSchema = z.object({
    oklch: OKLCHSchema,
    options: ColorBuildOptionsSchema.optional(),
  });

  const inputResult = inputSchema.safeParse(body);
  if (!inputResult.success) {
    res.statusCode = 400;
    const issues = inputResult.error.issues;
    const message = issues[0]
      ? `${issues[0].path.join('.') || 'oklch'}: ${issues[0].message}`
      : inputResult.error.message;
    res.end(JSON.stringify({ ok: false, error: message }));
    return;
  }

  const { oklch, options } = inputResult.data;

  // Build the ColorValue using color-utils
  try {
    // Strip undefined values to satisfy exactOptionalPropertyTypes
    const cleanOptions: Record<string, unknown> = {};
    if (options) {
      for (const [k, v] of Object.entries(options)) {
        if (v !== undefined) cleanOptions[k] = v;
      }
    }
    const colorValue = buildColorValue(
      oklch,
      cleanOptions as Parameters<typeof buildColorValue>[1],
    );

    // Validate output against schema
    const outputResult = ColorValueSchema.safeParse(colorValue);
    if (!outputResult.success) {
      console.log(`[rafters] ColorValue validation failed: ${outputResult.error.message}`);
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: 'ColorValue generation failed validation' }));
      return;
    }

    const response = ColorBuildResponseSchema.parse({ ok: true, colorValue: outputResult.data });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.log(`[rafters] Color build failed: ${error}`);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: String(error) }));
  }
}

// Extracted async handler for POST /api/tokens/:name (exported for testing)
export async function handlePostToken(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  name: string,
  registry: TokenRegistry,
): Promise<void> {
  // Token must exist for update
  const existingToken = registry.get(name);
  if (!existingToken) {
    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: `Token "${name}" not found` }));
    return;
  }

  // Parse request body
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    res.statusCode = 400;
    const message = error instanceof Error ? error.message : 'Invalid JSON body';
    res.end(JSON.stringify({ ok: false, error: message }));
    return;
  }

  // Validate patch data against namespace-specific schema
  const namespaceSchema = getNamespacePatchSchema(existingToken.namespace);
  const patchResult = namespaceSchema.safeParse(body);
  if (!patchResult.success) {
    res.statusCode = 400;
    const issues = patchResult.error.issues;
    const message = issues[0]
      ? `${issues[0].path.join('.') || 'value'}: ${issues[0].message}`
      : patchResult.error.message;
    res.end(JSON.stringify({ ok: false, error: message }));
    return;
  }

  // Merge patch with existing token
  const mergedToken = {
    ...existingToken,
    ...(patchResult.data as Record<string, unknown>),
  };

  // Validate merged token against full schema
  const tokenResult = TokenSchema.safeParse(mergedToken);
  if (!tokenResult.success) {
    res.statusCode = 400;
    const issues = tokenResult.error.issues;
    const message = issues[0]
      ? `${issues[0].path.join('.') || 'token'}: ${issues[0].message}`
      : tokenResult.error.message;
    res.end(JSON.stringify({ ok: false, error: message }));
    return;
  }

  // Update full token via registry (handles cascade + persist)
  try {
    await registry.setToken(tokenResult.data);
    const updatedToken = registry.get(name);
    const response = TokenResponseSchema.parse({ ok: true, token: updatedToken });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.log(`[rafters] Token update failed for "${name}": ${error}`);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: String(error) }));
  }
}

// Batch token schema - array of tokens
const TokenArraySchema = z.array(TokenSchema);

// Schema for namespace query param validation
const NamespaceParamSchema = z.string().min(1).optional();

// Extracted handler for GET /api/tokens (with optional namespace filter) - exported for testing
export function handleGetTokens(
  url: string,
  res: import('node:http').ServerResponse,
  registry: TokenRegistry,
  initialized: boolean,
): void {
  try {
    // Parse query params for namespace filter
    const parsedUrl = new URL(url, 'http://localhost');
    const namespaceParam = parsedUrl.searchParams.get('namespace');

    // Validate namespace param if provided (empty string is invalid)
    const namespaceResult = NamespaceParamSchema.safeParse(namespaceParam ?? undefined);
    if (namespaceParam !== null && !namespaceResult.success) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: 'Invalid namespace parameter' }));
      return;
    }

    let tokens = registry.list();

    // Filter by namespace if provided and non-empty
    if (namespaceParam && namespaceResult.success && namespaceResult.data) {
      tokens = tokens.filter((t) => t.namespace === namespaceResult.data);
    }

    const tokensResult = z.array(TokenSchema).safeParse(tokens);
    if (!tokensResult.success) {
      console.log(`[rafters] Tokens list failed validation: ${tokensResult.error.message}`);
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: 'Token validation failed' }));
      return;
    }

    const response = TokensResponseSchema.parse({
      tokens: tokensResult.data,
      initialized,
    });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.log(`[rafters] Failed to list tokens: ${error}`);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'Failed to retrieve tokens' }));
  }
}

// Extracted async handler for POST /api/tokens (batch) - exported for testing
export async function handlePostTokens(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  registry: TokenRegistry,
): Promise<void> {
  // Parse request body
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    res.statusCode = 400;
    const message = error instanceof Error ? error.message : 'Invalid JSON body';
    res.end(JSON.stringify({ ok: false, error: message }));
    return;
  }

  // Validate as array of tokens
  const tokensResult = TokenArraySchema.safeParse(body);
  if (!tokensResult.success) {
    res.statusCode = 400;
    const issues = tokensResult.error.issues;
    const message = issues[0]
      ? `${issues[0].path.join('.') || 'tokens'}: ${issues[0].message}`
      : tokensResult.error.message;
    res.end(JSON.stringify({ ok: false, error: message }));
    return;
  }

  const tokens = tokensResult.data;

  // Validate all tokens exist before updating
  for (const token of tokens) {
    if (!registry.has(token.name)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, error: `Token "${token.name}" not found` }));
      return;
    }
  }

  // Batch update via registry (single persist)
  try {
    await registry.setTokens(tokens);

    // Return updated tokens
    const updatedTokens = tokens.map((t) => registry.get(t.name)).filter(Boolean);
    const response = TokensResponseSchema.parse({
      tokens: updatedTokens,
      initialized: true,
    });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.log(`[rafters] Batch token update failed: ${error}`);
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: String(error) }));
  }
}

export function studioApiPlugin(): Plugin {
  let registry: TokenRegistry;
  let initialized = false;

  return {
    name: 'rafters-studio-api',

    async configureServer(server: ViteDevServer) {
      // Initialize registry from persistence
      try {
        const adapter = new NodePersistenceAdapter(projectPath);
        const tokens = await adapter.load();
        registry = new TokenRegistry(tokens);
        registry.setAdapter(adapter);
        initialized = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[rafters] Failed to initialize: ${message}`);
        if (message.includes('ENOENT')) {
          console.log(`[rafters] No project found at ${projectPath}. Run 'rafters init' first.`);
        }
        // Create empty registry as fallback
        registry = new TokenRegistry([]);
        initialized = false;
      }

      // Change callback: regenerate CSS for HMR
      registry.setChangeCallback(async () => {
        try {
          await writeFile(outputPath, registryToVars(registry));
          server.ws.send({ type: 'custom', event: 'rafters:css-updated' });
        } catch (error) {
          console.log(`[rafters] CSS regeneration failed: ${error}`);
        }
      });

      // Listen for token updates from client
      server.ws.on('rafters:set-token', async (rawData: unknown, client) => {
        // Validate incoming message
        const parsed = SetTokenMessageSchema.safeParse(rawData);
        if (!parsed.success) {
          client.send('rafters:token-updated', {
            ok: false,
            error: `Invalid message: ${parsed.error.message}`,
          });
          return;
        }

        const data = parsed.data;
        const shouldPersist = data.persist !== false;

        try {
          if (shouldPersist) {
            // Full save: update + cascade + persist (callback handles CSS)
            await registry.set(data.name, data.value);
          } else {
            // Instant feedback: update in-memory only (callback handles CSS)
            registry.updateToken(data.name, data.value);
          }
          client.send('rafters:token-updated', {
            ok: true,
            name: data.name,
            persisted: shouldPersist,
          });
        } catch (error) {
          console.log(`[rafters] Token update failed for "${data.name}": ${error}`);
          client.send('rafters:token-updated', { ok: false, error: String(error) });
        }
      });

      // REST endpoints for token queries
      server.middlewares.use((req, res, next) => {
        // Parse pathname only (ignore query strings)
        let pathname: string;
        try {
          pathname = new URL(req.url ?? '', 'http://localhost').pathname;
        } catch {
          next();
          return;
        }

        // /api/color/build - POST to build ColorValue from OKLCH
        if (pathname === '/api/color/build') {
          res.setHeader('Content-Type', 'application/json');

          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'POST');
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
            return;
          }

          handleBuildColor(req, res).catch((error) => {
            console.log(`[rafters] Unhandled error in POST /api/color/build: ${error}`);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
            }
          });
          return;
        }

        // /api/tokens/:name - GET or POST specific token
        const tokenMatch = pathname.match(/^\/api\/tokens\/(.+)$/);
        if (tokenMatch) {
          let name: string;
          try {
            name = decodeURIComponent(tokenMatch[1] ?? '');
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Invalid token name encoding' }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');

          // Only allow GET and POST methods
          if (req.method !== 'GET' && req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET, POST');
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
            return;
          }

          // POST /api/tokens/:name - Update token with partial data
          if (req.method === 'POST') {
            handlePostToken(req, res, name, registry).catch((error) => {
              // Catch any unhandled errors from the async handler
              console.log(`[rafters] Unhandled error in POST /api/tokens/${name}: ${error}`);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
              }
            });
            return;
          }

          // GET /api/tokens/:name - Get specific token
          const token = registry.get(name);

          if (!token) {
            const errorResponse = ErrorResponseSchema.parse({
              ok: false,
              error: `Token "${name}" not found`,
            });
            res.statusCode = 404;
            res.end(JSON.stringify(errorResponse));
            return;
          }

          // Validate token against schema before returning
          const tokenResult = TokenSchema.safeParse(token);
          if (!tokenResult.success) {
            console.log(
              `[rafters] Token "${name}" failed validation: ${tokenResult.error.message}`,
            );
            const errorResponse = ErrorResponseSchema.parse({
              ok: false,
              error: `Token "${name}" has invalid structure`,
            });
            res.statusCode = 500;
            res.end(JSON.stringify(errorResponse));
            return;
          }

          const response = TokenResponseSchema.parse({ ok: true, token: tokenResult.data });
          res.end(JSON.stringify(response));
          return;
        }

        // /api/tokens - GET list or POST batch update
        if (pathname === '/api/tokens') {
          res.setHeader('Content-Type', 'application/json');

          // Only allow GET and POST methods
          if (req.method !== 'GET' && req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET, POST');
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
            return;
          }

          // POST /api/tokens - Batch update tokens
          if (req.method === 'POST') {
            handlePostTokens(req, res, registry).catch((error) => {
              console.log(`[rafters] Unhandled error in POST /api/tokens: ${error}`);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
              }
            });
            return;
          }

          // GET /api/tokens - List tokens (optionally filtered by namespace)
          handleGetTokens(req.url ?? '', res, registry, initialized);
          return;
        }

        next();
      });
    },
  };
}
