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

import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { buildColorValue, rebakeAccessibility } from '@rafters/color-utils';
import {
  contrastPlugin,
  invertPlugin,
  loadRegistryFromDir,
  regenerateOutputs,
  resolveContentSources,
  saveRegistryToDir,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import {
  ColorReferenceSchema,
  type ColorValue,
  ColorValueSchema,
  OKLCHSchema,
  TokenSchema,
} from '@rafters/shared';
import type { Plugin, ViteDevServer } from 'vite';
import { z } from 'zod';

const REGISTRY_PLUGINS = [scalePlugin, contrastPlugin, statePlugin, invertPlugin];

// Default reason recorded on userOverride for studio-driven changes that
// don't supply one explicitly. The studio UI is interactive editing -- every
// change is a designer decision, even when the surface didn't capture a
// specific motivation.
const STUDIO_REASON_DEFAULT = 'studio interactive edit';

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
const outputDir = join(projectPath, '.rafters', 'output');
const configPath = join(projectPath, '.rafters', 'config.rafters.json');

// ============================================================================
// Config schemas and types (local mirrors -- studio does not import from @rafters/cli)
// Zod validates external data from config.rafters.json per repo invariant.
// ============================================================================

/** Zod schema for font file locations and web font imports. */
export const FontsConfigSchema = z.object({
  path: z.union([z.string(), z.null()]).optional(),
  imports: z.array(z.string()).optional(),
});
export type FontsConfig = z.infer<typeof FontsConfigSchema>;

/**
 * Permissive schema for config.rafters.json. Uses passthrough so unknown
 * fields (framework, installed, etc.) survive the parse and are returned
 * to the client by getConfig.
 */
export const RaftersConfigSchema = z
  .object({
    intent: z.string().optional(),
    fonts: FontsConfigSchema.optional(),
    source: z.string().optional(),
    darkMode: z.enum(['class', 'media']).optional(),
    framework: z.string().optional(),
    cssPath: z.union([z.string(), z.null()]).optional(),
    exports: z.record(z.string(), z.boolean()).optional(),
  })
  .passthrough();
export type RaftersConfig = z.infer<typeof RaftersConfigSchema>;

/** Intent names Studio knows how to resolve. */
export const KNOWN_INTENTS = ['efficient'] as const;
export type KnownIntent = (typeof KNOWN_INTENTS)[number];

/**
 * Read config.rafters.json with shadcn->source migration and Zod
 * validation applied. Returns null when the file cannot be read or
 * fails validation.
 */
export async function readRaftersConfig(): Promise<RaftersConfig | null> {
  try {
    const raw = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;
    // shadcn -> source migration (#2049)
    if ('shadcn' in raw && !('source' in raw)) {
      if (raw.shadcn === true) raw.source = 'shadcn';
      delete raw.shadcn;
    }
    const result = RaftersConfigSchema.safeParse(raw);
    if (!result.success) {
      console.log(`[rafters] Config validation failed: ${result.error.message}`);
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Validate that a fonts path is relative (or null/undefined).
 * Returns an error string if invalid, null if valid.
 */
export function validateFontsPath(path: string | null | undefined): string | null {
  if (path === null || path === undefined) return null;
  if (isAbsolute(path)) return 'fonts path must be relative';
  return null;
}

/**
 * Validate an intent name against known intents.
 * Returns an error string if invalid, null if valid.
 */
export function validateIntent(intent: string): string | null {
  if (!(KNOWN_INTENTS as readonly string[]).includes(intent)) {
    return `unknown intent "${intent}". Known: ${KNOWN_INTENTS.join(', ')}`;
  }
  return null;
}

/**
 * The slice of config.rafters.json the regen path needs: which outputs to emit
 * and the component paths the compiled sheet scans. Read fresh on each regen so
 * a changed config (e.g. a newly added namespace) is honored.
 */
interface StudioConfig {
  exports?: {
    tailwind: boolean;
    typescript: boolean;
    dtcg: boolean;
    compiled: boolean;
    documentation: boolean;
  };
  componentsPath?: string | Array<string | { path: string }>;
  primitivesPath?: string | Array<string | { path: string }>;
  compositesPath?: string | Array<string | { path: string }>;
  source?: string;
  darkMode?: 'class' | 'media';
}

async function loadStudioConfig(): Promise<StudioConfig | null> {
  const raw = await readRaftersConfig();
  return raw as unknown as StudioConfig | null;
}

// Zod schema for incoming WebSocket messages
const SetTokenMessageSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), ColorValueSchema, ColorReferenceSchema]),
  persist: z.boolean().optional(),
  reason: z.string().optional(),
});

/**
 * The designer-owned config fields Studio may patch over `rafters:set-config`.
 * Every key is optional -- absent keys are left untouched; `fonts` merges over
 * the existing object. Intent/font values are further checked by
 * validateIntent / validateFontsPath before the write.
 */
const ConfigPatchSchema = z
  .object({
    intent: z.string().min(1).optional(),
    darkMode: z.enum(['class', 'media']).optional(),
    fonts: FontsConfigSchema.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'patch must set at least one of: intent, darkMode, fonts',
  });

/**
 * The correlation id the client attaches to a request so it can match the reply
 * to the right in-flight call (get-config and set-config share the
 * `rafters:config` reply event). Echoed back verbatim on every reply. `__rid`
 * is stripped by the config schemas' object parse, so it never lands in the
 * written config.
 */
function ridOf(rawData: unknown): string | undefined {
  const rid = (rawData as { __rid?: unknown } | null)?.__rid;
  return typeof rid === 'string' ? rid : undefined;
}

// Schema for POST /api/tokens/:name - partial token update
// Derived from TokenSchema: value required, patchable fields optional.
// userOverride is nullable on Token (required, null = baseline) but optional in
// patch payloads -- a PATCH that omits userOverride leaves the existing value intact.
export const TokenPatchSchema = TokenSchema.pick({
  value: true,
  trustLevel: true,
  elevationLevel: true,
  motionIntent: true,
  accessibilityLevel: true,
  description: true,
}).extend({
  userOverride: TokenSchema.shape.userOverride.optional(),
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

  const existingToken = registry.get(name);

  // CREATE: token does not exist
  if (!existingToken) {
    const createSchema = z.object({
      namespace: z.string().min(1),
      category: z.string().min(1),
      value: z.union([z.string(), ColorValueSchema, ColorReferenceSchema]),
      userOverride: z.object({
        previousValue: z.union([z.string(), ColorValueSchema, ColorReferenceSchema]),
        reason: z.string().min(1, 'Reason is required. Every token needs a why.'),
        context: z.string().optional(),
      }),
      description: z.string().optional(),
    });

    const createResult = createSchema.safeParse(body);
    if (!createResult.success) {
      res.statusCode = 400;
      const issues = createResult.error.issues;
      const message = issues[0]
        ? `${issues[0].path.join('.') || 'body'}: ${issues[0].message}`
        : createResult.error.message;
      res.end(JSON.stringify({ ok: false, error: message }));
      return;
    }

    const newToken = {
      name,
      namespace: createResult.data.namespace,
      category: createResult.data.category,
      value: createResult.data.value,
      userOverride: createResult.data.userOverride,
      containerQueryAware: true,
      description: createResult.data.description,
    };

    const tokenResult = TokenSchema.safeParse(newToken);
    if (!tokenResult.success) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: tokenResult.error.message }));
      return;
    }

    try {
      // Brand-new token: define handles metadata + value + binding atomically.
      registry.define(tokenResult.data);
      const response = TokenResponseSchema.parse({ ok: true, token: registry.get(name) });
      res.statusCode = 201;
      res.end(JSON.stringify(response));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: String(error) }));
    }
    return;
  }

  // UPDATE: token exists -- validate patch against namespace-specific schema
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

  // Re-bake WCAG matrices when the incoming value carries a scale -- a family
  // supplied as bare {name, scale} would otherwise starve the contrast/state/
  // invert plugins downstream (guard moved from the removed CLI set, #1643).
  if (
    mergedToken.value &&
    typeof mergedToken.value === 'object' &&
    'scale' in (mergedToken.value as Record<string, unknown>)
  ) {
    mergedToken.value = rebakeAccessibility(mergedToken.value as ColorValue);
  }

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

  // Update existing token. Two paths in the new registry:
  //   - value change      -> registry.set(name, value, { reason })
  //                          (records userOverride; cascades through bindings)
  //   - metadata refresh  -> registry.define(token)
  //                          (re-establishes metadata + binding atomically)
  // The patch path runs both: define applies the merged metadata; set captures
  // the value transition with a userOverride diary entry. The reason is taken
  // from the patch's userOverride.reason if present (the API has always
  // required reason on create -- patches can carry one too) or defaults to
  // STUDIO_REASON_DEFAULT.
  try {
    const merged = tokenResult.data;
    const patchOverride = (patchResult.data as { userOverride?: { reason?: string } }).userOverride;
    const reason = patchOverride?.reason ?? STUDIO_REASON_DEFAULT;
    registry.define(merged);
    registry.set(merged.name, merged.value, { reason });
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

  // Batch update -- loop define+set per token. The new registry doesn't ship
  // a transactional batch primitive; the cascade still walks correctly per
  // call.
  try {
    for (const token of tokens) {
      const reason = token.userOverride?.reason ?? STUDIO_REASON_DEFAULT;
      registry.define(token);
      registry.set(token.name, token.value, { reason });
    }
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
      // Initialize registry from persisted .rafters/tokens (already carries the
      // binding tree from `rafters init`); plugins are registered here so any
      // semantic with a state/contrast/scale/invert binding resolves at load.
      const tokensDir = join(projectPath, '.rafters', 'tokens');
      try {
        registry = loadRegistryFromDir(tokensDir, REGISTRY_PLUGINS);
        initialized = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[rafters] Failed to initialize: ${message}`);
        if (message.includes('ENOENT')) {
          console.log(`[rafters] No project found at ${projectPath}. Run 'rafters init' first.`);
        }
        registry = new TokenRegistry([], REGISTRY_PLUGINS);
        initialized = false;
      }

      // The one output+HMR step: project the current registry to disk outputs
      // and signal HMR. Does NOT persist tokens -- that is the caller's choice,
      // which is also what keeps the file watch below from looping (it never
      // writes back into a watched path).
      const regenerate = async (): Promise<void> => {
        const config = await loadStudioConfig();
        const exports = config?.exports ?? {
          tailwind: true,
          typescript: true,
          dtcg: false,
          compiled: false,
          documentation: false,
        };
        await regenerateOutputs(
          registry,
          {
            outputDir,
            exports,
            contentSources: config ? resolveContentSources(projectPath, config) : [],
            darkMode: config?.darkMode ?? 'class',
            includeImport: config?.source !== 'shadcn',
          },
          { notify: () => server.ws.send({ type: 'custom', event: 'rafters:css-updated' }) },
        );
      };

      // Persist the registry to disk, then regenerate outputs + signal HMR.
      // Replaces v1's setChangeCallback / setAdapter wiring -- callers explicitly
      // invoke this after each in-memory change.
      const persistAndNotify = async (): Promise<void> => {
        try {
          if (initialized) {
            saveRegistryToDir(tokensDir, registry);
          }
          await regenerate();
        } catch (error) {
          console.log(`[rafters] CSS regeneration failed: ${error}`);
        }
      };

      // The single file watch: any change to the token files, the configured
      // component/primitive/composite class sources, or the config reloads the
      // registry from disk and regenerates (no token write -> no watch loop).
      // This is the only filesystem-driven regen path; studio API edits share
      // the same `regenerate` via persistAndNotify.
      const reloadAndRegenerate = async (): Promise<void> => {
        try {
          registry = loadRegistryFromDir(tokensDir, REGISTRY_PLUGINS);
          initialized = true;
        } catch {
          // Tokens unreadable mid-edit -- keep the current registry and still
          // regenerate so a .classes.ts-only change is picked up.
        }
        try {
          await regenerate();
        } catch (error) {
          console.log(`[rafters] CSS regeneration failed: ${error}`);
        }
      };

      {
        const trackedClassDirs = new Set<string>();

        const syncWatchTargets = async (): Promise<void> => {
          const watchConfig = await loadStudioConfig();
          const classDirs = watchConfig ? resolveContentSources(projectPath, watchConfig) : [];
          const newDirs = classDirs.filter((d) => !trackedClassDirs.has(d));
          if (newDirs.length > 0) {
            server.watcher.add(newDirs.map((dir) => join(dir, '**/*.classes.ts')));
            for (const d of newDirs) trackedClassDirs.add(d);
          }
        };

        server.watcher.add([join(tokensDir, '*.rafters.json'), configPath]);
        await syncWatchTargets();

        let debounce: ReturnType<typeof setTimeout> | null = null;
        const onChange = (changed: string): void => {
          const watched =
            changed.endsWith('.classes.ts') ||
            changed.endsWith('.rafters.json') ||
            changed === configPath;
          if (!watched) return;
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => {
            const isConfigChange = changed === configPath;
            const run = isConfigChange
              ? syncWatchTargets().then(reloadAndRegenerate)
              : reloadAndRegenerate();
            void run;
          }, 150);
        };
        server.watcher.on('change', onChange);
        server.watcher.on('add', onChange);
        server.watcher.on('unlink', onChange);
      }

      // Listen for token updates from client
      server.ws.on('rafters:set-token', async (rawData: unknown, client) => {
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

        // Detect color tokens for async enrichment
        const existingToken = registry.get(data.name);
        const isColorFamily =
          existingToken?.namespace === 'color' &&
          typeof data.value === 'object' &&
          data.value !== null &&
          'scale' in data.value;

        // Fire API enrichment before local math (non-blocking)
        let enrichmentPromise: Promise<unknown> | null = null;
        if (isColorFamily) {
          const colorValue = data.value as { scale?: Array<{ l: number; c: number; h: number }> };
          const base = colorValue.scale?.[5]; // scale position 500 is the base
          if (base) {
            const l = base.l.toFixed(3);
            const c = base.c.toFixed(3);
            const h = Math.round(base.h);
            enrichmentPromise = fetch(`https://api.rafters.studio/color/${l}-${c}-${h}?sync=true`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null);
          }
        }

        const reason = data.reason ?? STUDIO_REASON_DEFAULT;
        try {
          // Local update (instant feedback). The new registry always records a
          // userOverride diary entry on set; cascade to dependents fires
          // through the binding graph. shouldPersist controls whether we
          // additionally write to disk + signal HMR.
          registry.set(data.name, data.value, { reason });
          if (shouldPersist) {
            await persistAndNotify();
          }
          client.send('rafters:token-updated', {
            ok: true,
            name: data.name,
            persisted: shouldPersist,
          });

          // Merge enrichment when it arrives
          if (enrichmentPromise) {
            const enrichment = await enrichmentPromise;
            if (enrichment && typeof enrichment === 'object' && 'color' in enrichment) {
              const apiColor = (enrichment as { color: { intelligence?: unknown } }).color;
              if (apiColor?.intelligence) {
                const current = registry.get(data.name);
                if (current && typeof current.value === 'object' && current.value !== null) {
                  const enrichedValue = {
                    ...(current.value as Record<string, unknown>),
                    intelligence: apiColor.intelligence,
                  } as typeof current.value;
                  registry.set(data.name, enrichedValue, {
                    reason: `${reason} (enriched by api.rafters.studio)`,
                  });
                  await persistAndNotify();
                  client.send('rafters:color-enriched', {
                    name: data.name,
                    intelligence: apiColor.intelligence,
                  });
                }
              }
            }
          }
        } catch (error) {
          console.log(`[rafters] Token update failed for "${data.name}": ${error}`);
          client.send('rafters:token-updated', { ok: false, error: String(error) });
        }
      });

      // Listen for config reads from client
      server.ws.on('rafters:get-config', async (rawData: unknown, client) => {
        const __rid = ridOf(rawData);
        const reply = (msg: Record<string, unknown>): void =>
          client.send('rafters:config', { ...msg, __rid });
        const config = await readRaftersConfig();
        if (!config) {
          reply({ ok: false, error: `config not found at ${configPath}` });
          return;
        }
        reply({ ok: true, config });
      });

      // Listen for config patches from client. One setter for every
      // designer-owned field (intent, darkMode, fonts); absent keys are left
      // untouched. Replies on the same `rafters:config` event as get-config,
      // tagged with the request's correlation id.
      server.ws.on('rafters:set-config', async (rawData: unknown, client) => {
        const __rid = ridOf(rawData);
        const reply = (msg: Record<string, unknown>): void =>
          client.send('rafters:config', { ...msg, __rid });

        const parsed = ConfigPatchSchema.safeParse(rawData);
        if (!parsed.success) {
          reply({ ok: false, error: `Invalid patch: ${parsed.error.message}` });
          return;
        }
        const patch = parsed.data;

        // Per-field validation, gathered in one place. Rules unchanged.
        if (patch.intent !== undefined) {
          const intentError = validateIntent(patch.intent);
          if (intentError) {
            reply({ ok: false, error: intentError });
            return;
          }
        }
        if (patch.fonts?.path !== undefined) {
          const pathError = validateFontsPath(patch.fonts.path);
          if (pathError) {
            reply({ ok: false, error: pathError });
            return;
          }
        }

        const config = await readRaftersConfig();
        if (!config) {
          reply({ ok: false, error: `config not found at ${configPath}` });
          return;
        }

        const updated: RaftersConfig = { ...config };
        if (patch.intent !== undefined) updated.intent = patch.intent;
        if (patch.darkMode !== undefined) updated.darkMode = patch.darkMode;
        if (patch.fonts !== undefined) {
          // Merge incoming fonts over existing, field-by-field. undefined means
          // "leave alone"; explicit null or value means "set".
          const merged: FontsConfig = { ...config.fonts };
          if (patch.fonts.path !== undefined) merged.path = patch.fonts.path;
          if (patch.fonts.imports !== undefined) merged.imports = patch.fonts.imports;
          updated.fonts = merged;
        }

        try {
          await writeFile(configPath, `${JSON.stringify(updated, null, 2)}\n`);
          reply({ ok: true, config: updated });
        } catch (error) {
          console.log(`[rafters] Config update failed: ${error}`);
          reply({ ok: false, error: String(error) });
        }
      });

      // REST endpoints for token queries
      server.middlewares.use(async (req, res, next) => {
        // Parse pathname only (ignore query strings)
        let pathname: string;
        try {
          pathname = new URL(req.url ?? '', 'http://localhost').pathname;
        } catch {
          next();
          return;
        }

        // /api/ or /api - GET structured API info
        if ((pathname === '/api/' || pathname === '/api') && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              name: 'Rafters Studio API',
              initialized,
              tokenCount: registry.list().length,
              rules: {
                whyGate: 'Every POST to /api/tokens/:name requires userOverride.reason.',
                gets: 'Returns full Token with all intelligence metadata.',
                sets: 'Value + reason in. API fills the Token shape. CSS updates via HMR.',
                colors: 'POST /api/color/build with OKLCH to get a ColorValue.',
              },
              endpoints: {
                'GET /api/tokens': 'All tokens (optional ?namespace= filter)',
                'GET /api/tokens/:name': 'One token with full data',
                'POST /api/tokens/:name': 'Update token (namespace-validated patch)',
                'POST /api/tokens': 'Batch update tokens',
                'POST /api/color/build': 'OKLCH -> full ColorValue',
                'POST /api/shutdown': 'Gracefully stop the studio',
              },
            }),
          );
          return;
        }

        // /api/shutdown - POST to gracefully stop the studio
        if (pathname === '/api/shutdown' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, message: 'Shutting down' }));
          console.log('[rafters] Studio shutting down...');
          setTimeout(() => server.close(), 100);
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
            try {
              await handlePostToken(req, res, name, registry);
              if (res.statusCode < 400) await persistAndNotify();
            } catch (error) {
              console.log(`[rafters] Unhandled error in POST /api/tokens/${name}: ${error}`);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
              }
            }
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
            try {
              await handlePostTokens(req, res, registry);
              if (res.statusCode < 400) await persistAndNotify();
            } catch (error) {
              console.log(`[rafters] Unhandled error in POST /api/tokens: ${error}`);
              if (!res.headersSent) {
                res.statusCode = 500;
                res.end(JSON.stringify({ ok: false, error: 'Internal server error' }));
              }
            }
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
