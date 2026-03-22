/**
 * Individual Component Endpoint
 * GET /registry/components/[name].json
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { listComponentNames, loadComponent } from '../../../lib/registry/componentService';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const names = listComponentNames();
  return names.map((name) => ({ params: { name } }));
};

export const GET: APIRoute = async ({ params }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: 'Component name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const component = loadComponent(name);

  if (!component) {
    return new Response(JSON.stringify({ error: `Component '${name}' not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(component, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
