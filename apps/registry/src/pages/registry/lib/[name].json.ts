/**
 * Individual Lib Substrate Endpoint
 * GET /registry/lib/[name].json
 *
 * Serves the behavior-layer lib substrate (contract, compose, slices) copy-in,
 * resolved like a primitive but installed to `@/lib`.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { listLibNames, loadLib } from '../../../lib/registry/componentService';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const names = listLibNames();
  return names.map((name) => ({ params: { name } }));
};

export const GET: APIRoute = async ({ params }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: 'Lib name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const item = loadLib(name);

  if (!item) {
    return new Response(JSON.stringify({ error: `Lib '${name}' not found` }), {
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
