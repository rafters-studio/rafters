import { createRoute, z } from '@hono/zod-openapi';
import { TokenSchema } from '@rafters/shared';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

const OkSchema = z.object({ ok: z.literal(true) });
const ErrorSchema = z.object({ message: z.string() });

const SystemSchema = z.object({
  namespaces: z.array(z.string()),
  tokenCount: z.number(),
});

const NamespaceSchema = z.object({
  namespace: z.string(),
  tokens: z.array(TokenSchema),
  count: z.number(),
});

const TokenDetailSchema = z.object({
  token: TokenSchema,
  dependsOn: z.array(z.string()),
  dependents: z.array(z.string()),
  generationRule: z.string().optional(),
  hasOverride: z.boolean(),
});

const AllTokensSchema = z.object({
  namespaces: z.array(z.string()),
  tokenCount: z.number(),
  tokens: z.record(z.string(), z.array(TokenSchema)),
});

// Designer sends value + reason. API fills the rest.
const SetTokenSchema = z.object({
  value: z.string(),
  reason: z.string().min(1, 'Every change needs a why.'),
});

const BuildColorSchema = z.object({
  oklch: z.object({ l: z.number(), c: z.number(), h: z.number() }),
  token: z.string().optional(),
  value: z.string().optional(),
  use: z.string().optional(),
});

const ResetRequestSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
});

const ResetResponseSchema = z.object({
  namespace: z.string(),
  tokenCount: z.number(),
});

// Getters

export const getSystem = createRoute({
  tags: ['Tokens'],
  method: 'get',
  path: '/tokens/system',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(SystemSchema, 'System metadata'),
  },
});

export const getAllTokens = createRoute({
  tags: ['Tokens'],
  method: 'get',
  path: '/tokens',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(AllTokensSchema, 'All tokens by namespace'),
  },
});

export const getNamespace = createRoute({
  tags: ['Tokens'],
  method: 'get',
  path: '/tokens/{namespace}',
  request: { params: z.object({ namespace: z.string() }) },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(NamespaceSchema, 'Namespace tokens'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, 'Not found'),
  },
});

export const getToken = createRoute({
  tags: ['Tokens'],
  method: 'get',
  path: '/tokens/{namespace}/{name}',
  request: { params: z.object({ namespace: z.string(), name: z.string() }) },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(TokenDetailSchema, 'Token with dependencies'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, 'Not found'),
  },
});

// Setters

export const setToken = createRoute({
  tags: ['Tokens'],
  method: 'put',
  path: '/tokens/{namespace}/{name}',
  request: {
    params: z.object({ namespace: z.string(), name: z.string() }),
    body: jsonContent(SetTokenSchema, 'Value + reason'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(OkSchema, 'Updated'),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, 'Validation error'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, 'Not found'),
  },
});

export const clearOverride = createRoute({
  tags: ['Tokens'],
  method: 'delete',
  path: '/tokens/{namespace}/{name}/override',
  request: { params: z.object({ namespace: z.string(), name: z.string() }) },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(OkSchema, 'Cleared'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, 'Not found'),
  },
});

// Color

export const buildColor = createRoute({
  tags: ['Color'],
  method: 'post',
  path: '/color/build',
  request: { body: jsonContent(BuildColorSchema, 'OKLCH input') },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(OkSchema, 'ColorValue built'),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(ErrorSchema, 'Invalid input'),
  },
});

// Reset

export const resetNamespace = createRoute({
  tags: ['Tokens'],
  method: 'post',
  path: '/tokens/{namespace}/reset',
  request: {
    params: z.object({ namespace: z.string() }),
    body: jsonContent(ResetRequestSchema, 'Config overrides'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ResetResponseSchema, 'Regenerated'),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(ErrorSchema, 'Invalid namespace'),
  },
});
