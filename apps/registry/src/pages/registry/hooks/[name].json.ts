/**
 * Individual Hooks Substrate Endpoint
 * GET /registry/hooks/[name].json
 *
 * Serves the behavior-layer hooks substrate (use-memory, use-presence, ...)
 * copy-in, resolved like a primitive but installed to `@/hooks`.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { listHookNames, loadHook } from '../../../lib/registry/componentService';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const names = listHookNames();
  return names.map((name) => ({ params: { name } }));
};

export const GET: APIRoute = async ({ params }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: 'Hook name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const item = loadHook(name);

  if (!item) {
    return new Response(JSON.stringify({ error: `Hook '${name}' not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(item, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
