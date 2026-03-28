import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Index Route', () => {
  it('GET / returns structured API info', async () => {
    const res = await SELF.fetch('http://localhost/');

    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.name).toBe('Rafters Studio API');
    expect(json.version).toBeTruthy();
    expect(json.system).toBeTruthy();
    expect(json.rules).toBeTruthy();
    expect(json.endpoints).toBeTruthy();
  });

  it('GET /docs returns OpenAPI spec', async () => {
    const res = await SELF.fetch('http://localhost/docs');

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.openapi).toBe('3.1.0');
    expect(json.info.title).toBe('Rafters Design System API');
  });

  // Skip: Scalar reference page uses Vue components incompatible with workerd test env
  it.skip('GET /reference returns Scalar docs page', async () => {
    const res = await SELF.fetch('http://localhost/reference');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('GET /unknown returns 404', async () => {
    const res = await SELF.fetch('http://localhost/unknown-route');

    expect(res.status).toBe(404);
  });
});
