import { createRoute, z } from '@hono/zod-openapi';
import { RAFTERS_VERSION } from '@rafters/shared';
import * as HttpStatusCodes from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRouter } from '@/lib/create-app';

const AboutSchema = z.object({
  name: z.string(),
  version: z.string(),
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
        name: 'Rafters Color API',
        version: RAFTERS_VERSION,
        endpoints: {
          'GET /color/:oklch': 'Color intelligence for an OKLCH value (L.LLL-C.CCC-H)',
          'GET /color/search': 'Search colors by natural language',
          'POST /queue': 'Queue one color for intelligence generation',
          'POST /queue/batch': 'Queue up to 1000 colors',
          'POST /queue/spectrum': 'Queue a generated lightness/chroma/hue spectrum',
          'GET /queue/list': 'Queue backlog count',
        },
      },
      HttpStatusCodes.OK,
    );
  },
);

export default router;
