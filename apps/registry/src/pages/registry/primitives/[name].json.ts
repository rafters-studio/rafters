/**
 * Individual Primitive Endpoint
 * GET /registry/primitives/[name].json
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { listPrimitiveNames, loadPrimitive } from '../../../lib/registry/componentService';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const names = listPrimitiveNames();
  return names.map((name) => ({ params: { name } }));
};

export const GET: APIRoute = async ({ params }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: 'Primitive name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const primitive = loadPrimitive(name);

  if (!primitive) {
    return new Response(JSON.stringify({ error: `Primitive '${name}' not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(primitive, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
