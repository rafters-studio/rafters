/**
 * Registry Index Endpoint
 * GET /registry/index.json
 */

import type { APIRoute } from 'astro';
import { getRegistryIndex } from '../../lib/registry/componentService';

export const prerender = true;

export const GET: APIRoute = async () => {
  const index = getRegistryIndex();

  return new Response(JSON.stringify(index, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
