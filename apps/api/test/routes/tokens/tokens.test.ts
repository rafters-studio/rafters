import { SELF } from 'cloudflare:test';
import { buildColorSystem } from '@rafters/design-tokens';
import { beforeAll, describe, expect, it } from 'vitest';
import { initializeRegistry } from '../../../src/routes/tokens/tokens.handlers';

beforeAll(() => {
  const result = buildColorSystem();
  initializeRegistry(result.system.allTokens);
});

// =============================================================================
// Getters -- return ALL the data
// =============================================================================

describe('GET /tokens/system', () => {
  it('returns namespaces and count', async () => {
    const res = await SELF.fetch('http://localhost/tokens/system');
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect((json.namespaces as string[]).length).toBeGreaterThanOrEqual(11);
    expect(json.tokenCount).toBeGreaterThanOrEqual(500);
  });
});

describe('GET /tokens', () => {
  it('returns all tokens grouped by namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens');
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    const tokens = json.tokens as Record<string, unknown[]>;
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(11);
    expect(tokens.spacing?.length).toBeGreaterThan(0);
  });

  it('color tokens have full ColorValue with scale', async () => {
    const res = await SELF.fetch('http://localhost/tokens');
    const json = (await res.json()) as Record<string, unknown>;
    const tokens = json.tokens as Record<string, Array<Record<string, unknown>>>;
    const family = (tokens.color ?? []).find(
      (t) =>
        typeof t.value === 'object' &&
        t.value !== null &&
        'scale' in (t.value as Record<string, unknown>),
    );
    expect(family).toBeTruthy();
    const value = family?.value as Record<string, unknown>;
    expect((value.scale as unknown[]).length).toBe(11);
  });
});

describe('GET /tokens/:namespace', () => {
  it('returns namespace tokens', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing');
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.count).toBeGreaterThan(30);
  });

  it('404 for invalid namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('GET /tokens/:namespace/:name', () => {
  it('returns full token with dependencies', async () => {
    const res = await SELF.fetch('http://localhost/tokens/semantic/primary');
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.token).toBeTruthy();
    expect(json.dependsOn).toBeInstanceOf(Array);
    expect(json.dependents).toBeInstanceOf(Array);
    expect(typeof json.hasOverride).toBe('boolean');
  });

  it('404 for wrong namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens/color/spacing-1');
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Setters -- value + reason in, { ok: true } out
// =============================================================================

describe('PUT /tokens/:namespace/:name', () => {
  it('sets value with reason, returns ok', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-4', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '2rem', reason: 'Huttspawn compact UI' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);

    // Verify the change persisted via GET
    const check = await SELF.fetch('http://localhost/tokens/spacing/spacing-4');
    const detail = (await check.json()) as Record<string, unknown>;
    const token = detail.token as Record<string, unknown>;
    expect(token.value).toBe('2rem');
    expect(detail.hasOverride).toBe(true);
  });

  it('rejects empty reason', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-5', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '3rem', reason: '' }),
    });
    expect(res.status).toBe(422);
  });

  it('rejects missing reason', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-5', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '3rem' }),
    });
    expect(res.status).toBe(422);
  });

  it('404 for nonexistent token', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '1rem', reason: 'test' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /tokens/:namespace/:name/override', () => {
  it('clears override, returns ok', async () => {
    // Set an override first
    await SELF.fetch('http://localhost/tokens/spacing/spacing-6', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '99rem', reason: 'to be cleared' }),
    });

    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-6/override', {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);

    // Verify override is gone
    const check = await SELF.fetch('http://localhost/tokens/spacing/spacing-6');
    const detail = (await check.json()) as Record<string, unknown>;
    expect(detail.hasOverride).toBe(false);
  });

  it('404 for token without override', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-7/override', {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Reset
// =============================================================================

describe('POST /tokens/:namespace/reset', () => {
  it('regenerates namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.namespace).toBe('spacing');
    expect(json.tokenCount).toBe(36);
  });

  it('404 for invalid namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens/nonexistent/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Why-gate
// =============================================================================

describe('why-gate enforcement', () => {
  it('reason is recorded on the token', async () => {
    await SELF.fetch('http://localhost/tokens/spacing/spacing-8', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '4rem', reason: 'Accessibility audit finding' }),
    });

    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-8');
    const json = (await res.json()) as Record<string, unknown>;
    const token = json.token as Record<string, unknown>;
    const override = token.userOverride as Record<string, unknown>;
    expect(override.reason).toBe('Accessibility audit finding');
    expect(override.previousValue).toBeTruthy();
  });
});
