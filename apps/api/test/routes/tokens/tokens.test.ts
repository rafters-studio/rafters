import { SELF } from 'cloudflare:test';
import { generateBaseSystem } from '@rafters/design-tokens';
import { beforeAll, describe, expect, it } from 'vitest';
import { initializeRegistry } from '../../../src/routes/tokens/tokens.handlers';

/**
 * Real spacing token names, read out of the generated system rather than
 * hardcoded.
 *
 * These tests exercise ROUTES -- get, set, clear, reset, the why-gate -- and do
 * not care which token they operate on. Naming specific rungs (`spacing-4`,
 * `spacing-6`) coupled them to the shape of the spacing ladder, so they broke
 * when the ladder stopped being a linear multiplier table (#2031). Any distinct
 * spacing tokens serve equally well, and taking them from the system means the
 * suite survives the next scale change too.
 *
 * Indices are handed out deliberately: some of these tests mutate their token
 * and one asserts the ABSENCE of an override, so they must not share.
 */
let SPACING: string[] = [];
let SPACING_TOKEN_COUNT = 0;

beforeAll(() => {
  const system = generateBaseSystem();
  initializeRegistry(system.allTokens);

  const spacing = system.byNamespace.get('spacing') ?? [];
  SPACING_TOKEN_COUNT = spacing.length;
  SPACING = spacing
    .map((t) => t.name)
    .filter((n) => n !== 'spacing-base' && n !== 'spacing-progression');

  if (SPACING.length < 5) {
    throw new Error(`these tests need 5 distinct spacing tokens, got ${SPACING.length}`);
  }
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
    expect(json.count).toBe(SPACING_TOKEN_COUNT);
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
    const res = await SELF.fetch(`http://localhost/tokens/color/${SPACING[0]}`);
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Setters -- value + reason in, { ok: true } out
// =============================================================================

describe('PUT /tokens/:namespace/:name', () => {
  it('sets value with reason, returns ok', async () => {
    const res = await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[0]}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '2rem', reason: 'Huttspawn compact UI' }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);

    // Verify the change persisted via GET
    const check = await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[0]}`);
    const detail = (await check.json()) as Record<string, unknown>;
    const token = detail.token as Record<string, unknown>;
    expect(token.value).toBe('2rem');
    expect(detail.hasOverride).toBe(true);
  });

  it('rejects empty reason', async () => {
    const res = await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[1]}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '3rem', reason: '' }),
    });
    expect(res.status).toBe(422);
  });

  it('rejects missing reason', async () => {
    const res = await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[1]}`, {
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
    await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[2]}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '99rem', reason: 'to be cleared' }),
    });

    const res = await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[2]}/override`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);

    // Verify override is gone
    const check = await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[2]}`);
    const detail = (await check.json()) as Record<string, unknown>;
    expect(detail.hasOverride).toBe(false);
  });

  it('404 for token without override', async () => {
    const res = await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[3]}/override`, {
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
    expect(json.tokenCount).toBe(SPACING_TOKEN_COUNT);
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
    await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[4]}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '4rem', reason: 'Accessibility audit finding' }),
    });

    const res = await SELF.fetch(`http://localhost/tokens/spacing/${SPACING[4]}`);
    const json = (await res.json()) as Record<string, unknown>;
    const token = json.token as Record<string, unknown>;
    const override = token.userOverride as Record<string, unknown>;
    expect(override.reason).toBe('Accessibility audit finding');
    expect(override.previousValue).toBeTruthy();
  });
});
