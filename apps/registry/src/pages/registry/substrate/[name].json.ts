/**
 * Substrate Endpoint
 * GET /registry/substrate/[name].json
 *
 * One flat namespace for every behavior-layer substrate file across all
 * discovered kinds (lib, hooks, ...). The kind is carried in the served item's
 * file path (`<kind>/<name>.ts`); the consumer installs copy-in to `@/<kind>`.
 * Adding a kind dir under ui/src needs no new route -- listSubstrate discovers it.
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { listSubstrate, loadSubstrate } from '../../../lib/registry/componentService';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  return listSubstrate().map((name) => ({ params: { name } }));
};

export const GET: APIRoute = async ({ params }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: 'Substrate name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const item = loadSubstrate(name);

  if (!item) {
    return new Response(JSON.stringify({ error: `Substrate '${name}' not found` }), {
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
