import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Index Route', () => {
  it('GET / returns structured API info', async () => {
    const res = await SELF.fetch('http://localhost/');

    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.name).toBe('Rafters Color API');
    expect(json.version).toBeTruthy();
    expect(json.endpoints).toBeTruthy();
    expect(
      Object.keys(json.endpoints as Record<string, string>).some((e) => e.includes('/tokens')),
    ).toBe(false);
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

  it('serves no token routes', async () => {
    const res = await SELF.fetch('http://localhost/tokens');

    expect(res.status).toBe(404);
  });

  it('GET /unknown returns 404', async () => {
    const res = await SELF.fetch('http://localhost/unknown-route');

    expect(res.status).toBe(404);
  });
});
