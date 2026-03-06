/**
 * Individual Composite Endpoint
 * GET /registry/composites/[name].json
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { listCompositeNames, loadComposite } from '../../../lib/registry/componentService';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const names = listCompositeNames();
  return names.map((name) => ({ params: { name } }));
};

export const GET: APIRoute = async ({ params }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: 'Composite name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const composite = loadComposite(name);

  if (!composite) {
    return new Response(JSON.stringify({ error: `Composite '${name}' not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(composite, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
