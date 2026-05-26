import { createRoute, z } from '@hono/zod-openapi';
import { getAvailableNamespaces } from '@rafters/design-tokens';
import { RAFTERS_VERSION } from '@rafters/shared';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRouter } from '@/lib/create-app';

const AboutSchema = z.object({
  name: z.string(),
  version: z.string(),
  system: z.object({
    namespaces: z.array(z.string()),
    tokenCount: z.number(),
  }),
  rules: z.object({
    whyGate: z.string(),
    sets: z.string(),
    gets: z.string(),
    colors: z.string(),
  }),
  endpoints: z.record(z.string(), z.string()),
});

const router = createRouter().openapi(
  createRoute({
    tags: ['Index'],
    method: 'get',
    path: '/',
    responses: {
      [HttpStatusCodes.OK]: jsonContent(AboutSchema, 'API overview'),
    },
  }),
  (c) => {
    return c.json(
      {
        name: 'Rafters Studio API',
        version: RAFTERS_VERSION,
        system: {
          namespaces: getAvailableNamespaces(),
          tokenCount: 536,
        },
        rules: {
          whyGate: 'Every PUT requires a reason. No exceptions.',
          sets: 'Value + reason in. API fills the Token shape. Returns { ok: true }.',
          gets: 'Returns full Token with all intelligence metadata.',
          colors: 'POST /color/build with OKLCH to get a ColorValue before setting color tokens.',
        },
        endpoints: {
          'GET /tokens': 'All tokens by namespace',
          'GET /tokens/:namespace': 'One namespace',
          'GET /tokens/:namespace/:name': 'One token with dependencies',
          'GET /tokens/system': 'Namespace list and token count',
          'PUT /tokens/:namespace/:name': 'Set value + reason',
          'DELETE /tokens/:namespace/:name/override': 'Clear override, restore computed',
          'POST /color/build': 'OKLCH -> full ColorValue',
          'POST /tokens/:namespace/reset': 'Regenerate namespace from generators',
          'POST /api/shutdown': 'Gracefully stop the studio server',
        },
      },
      HttpStatusCodes.OK,
    );
  },
);

export default router;
