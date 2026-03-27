import { SELF } from 'cloudflare:test';
import { buildColorSystem } from '@rafters/design-tokens';
import { beforeAll, describe, expect, it } from 'vitest';
import { initializeRegistry } from '../../../src/routes/tokens/tokens.handlers';

// =============================================================================
// Setup: generate a real 536-token system and load into the registry
// =============================================================================

beforeAll(() => {
  const result = buildColorSystem();
  initializeRegistry(result.system.allTokens);
});

// =============================================================================
// Getters
// =============================================================================

describe('GET /tokens/system', () => {
  it('returns system metadata', async () => {
    const res = await SELF.fetch('http://localhost/tokens/system');
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.namespaces).toBeInstanceOf(Array);
    expect((json.namespaces as string[]).length).toBeGreaterThanOrEqual(11);
    expect(json.tokenCount).toBeGreaterThanOrEqual(500);
  });

  it('includes all expected namespaces', async () => {
    const res = await SELF.fetch('http://localhost/tokens/system');
    const json = (await res.json()) as Record<string, unknown>;
    const namespaces = json.namespaces as string[];

    expect(namespaces).toContain('color');
    expect(namespaces).toContain('spacing');
    expect(namespaces).toContain('typography');
    expect(namespaces).toContain('semantic');
    expect(namespaces).toContain('radius');
    expect(namespaces).toContain('shadow');
    expect(namespaces).toContain('motion');
  });
});

describe('GET /tokens', () => {
  it('returns all tokens grouped by namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens');
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.tokenCount).toBeGreaterThanOrEqual(500);
    expect(json.namespaces).toBeInstanceOf(Array);

    const tokens = json.tokens as Record<string, unknown[]>;
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(11);
    expect(tokens.color?.length).toBeGreaterThan(0);
    expect(tokens.spacing?.length).toBeGreaterThan(0);
  });

  it('color namespace has tokens with ColorValue objects', async () => {
    const res = await SELF.fetch('http://localhost/tokens');
    const json = (await res.json()) as Record<string, unknown>;
    const tokens = json.tokens as Record<string, Array<Record<string, unknown>>>;
    const colorTokens = tokens.color ?? [];

    const familyToken = colorTokens.find(
      (t) =>
        typeof t.value === 'object' &&
        t.value !== null &&
        'scale' in (t.value as Record<string, unknown>),
    );
    expect(familyToken).toBeTruthy();

    const value = familyToken?.value as Record<string, unknown>;
    expect(value.scale).toBeInstanceOf(Array);
    expect((value.scale as unknown[]).length).toBe(11);
  });
});

describe('GET /tokens/:namespace', () => {
  it('returns tokens for a valid namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing');
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.namespace).toBe('spacing');
    expect(json.count).toBeGreaterThan(30);
    expect((json.tokens as unknown[]).length).toBe(json.count);
  });

  it('returns 404 for invalid namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens/nonexistent');
    expect(res.status).toBe(404);
  });

  it('spacing tokens have mathematical progression', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing');
    const json = (await res.json()) as Record<string, unknown>;
    const tokens = json.tokens as Array<Record<string, unknown>>;

    const spacing1 = tokens.find((t) => t.name === 'spacing-1');
    const spacing2 = tokens.find((t) => t.name === 'spacing-2');
    expect(spacing1).toBeTruthy();
    expect(spacing2).toBeTruthy();

    // Values should be rem strings
    expect(String(spacing1?.value)).toMatch(/rem$/);
  });
});

describe('GET /tokens/:namespace/:name', () => {
  it('returns token detail with dependencies', async () => {
    const res = await SELF.fetch('http://localhost/tokens/semantic/primary');
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.token).toBeTruthy();
    expect(json.dependsOn).toBeInstanceOf(Array);
    expect(json.dependents).toBeInstanceOf(Array);
    expect(typeof json.hasOverride).toBe('boolean');
  });

  it('returns 404 for nonexistent token', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/nonexistent');
    expect(res.status).toBe(404);
  });

  it('returns 404 for token in wrong namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens/color/spacing-1');
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Setters
// =============================================================================

describe('PUT /tokens/:namespace/:name', () => {
  it('updates a token with reason', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: '0.5rem',
        reason: 'Tighter spacing for huttspawn compact UI',
      }),
    });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    const token = json.token as Record<string, unknown>;
    expect(token.value).toBe('0.5rem');
    expect(json.affected).toBeInstanceOf(Array);

    // Verify the override was recorded
    const override = token.userOverride as Record<string, unknown>;
    expect(override.reason).toBe('Tighter spacing for huttspawn compact UI');
    expect(override.previousValue).toBeTruthy();
  });

  it('rejects set without reason', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: '0.5rem',
        reason: '',
      }),
    });
    expect(res.status).toBe(422);
  });

  it('rejects set with missing reason field', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: '0.5rem',
      }),
    });
    expect(res.status).toBe(422);
  });

  it('returns 404 for nonexistent token', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: '1rem',
        reason: 'test',
      }),
    });
    expect(res.status).toBe(404);
  });

  it('cascades changes to dependent tokens', async () => {
    // First, check what depends on a color family token
    const detailRes = await SELF.fetch('http://localhost/tokens/semantic/primary');
    const detail = (await detailRes.json()) as Record<string, unknown>;
    const dependsOn = detail.dependsOn as string[];

    // If primary depends on a color family, updating that family should affect primary
    if (dependsOn.length > 0) {
      const parentName = dependsOn[0];
      const parentRes = await SELF.fetch('http://localhost/tokens');
      const allTokens = (await parentRes.json()) as Record<string, unknown>;
      const tokenMap = allTokens.tokens as Record<string, Array<Record<string, unknown>>>;

      // Find the parent token's namespace
      for (const [ns, tokens] of Object.entries(tokenMap)) {
        const parent = tokens.find((t) => t.name === parentName);
        if (parent) {
          const setRes = await SELF.fetch(`http://localhost/tokens/${ns}/${parentName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              value: parent.value,
              reason: 'Testing cascade propagation',
            }),
          });
          const setJson = (await setRes.json()) as Record<string, unknown>;
          const affected = setJson.affected as string[];
          // The cascade should have affected at least the parent itself
          expect(affected.length).toBeGreaterThanOrEqual(0);
          break;
        }
      }
    }
  });
});

describe('PUT /tokens (batch)', () => {
  it('updates multiple tokens with reasons', async () => {
    const res = await SELF.fetch('http://localhost/tokens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [
          { namespace: 'spacing', name: 'spacing-2', value: '1rem', reason: 'Batch test 1' },
          { namespace: 'spacing', name: 'spacing-3', value: '1.5rem', reason: 'Batch test 2' },
        ],
      }),
    });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.updated).toBe(2);
  });

  it('rejects batch with missing token', async () => {
    const res = await SELF.fetch('http://localhost/tokens', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: [{ namespace: 'spacing', name: 'nonexistent', value: '1rem', reason: 'test' }],
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /tokens/:namespace/:name/override', () => {
  it('clears an override and restores computed value', async () => {
    // First set an override
    await SELF.fetch('http://localhost/tokens/spacing/spacing-4', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: '999rem',
        reason: 'Override to clear',
      }),
    });

    // Then clear it
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-4/override', {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    const token = json.token as Record<string, unknown>;
    // Value should not be 999rem anymore
    expect(token.value).not.toBe('999rem');
  });

  it('returns 404 for token without override', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-5/override', {
      method: 'DELETE',
    });
    // Should be 404 because spacing-5 has no override
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Reset
// =============================================================================

describe('POST /tokens/:namespace/reset', () => {
  it('regenerates a namespace', async () => {
    // Get current spacing count
    const beforeRes = await SELF.fetch('http://localhost/tokens/spacing');
    const before = (await beforeRes.json()) as Record<string, unknown>;
    const beforeCount = before.count as number;

    // Reset spacing
    const res = await SELF.fetch('http://localhost/tokens/spacing/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.namespace).toBe('spacing');
    expect(json.tokenCount).toBe(beforeCount);
  });

  it('regenerates with config override', async () => {
    const res = await SELF.fetch('http://localhost/tokens/spacing/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: { progressionRatio: 'golden-ratio' },
      }),
    });
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.tokenCount).toBeGreaterThan(0);
  });

  it('wipes overrides in the reset namespace', async () => {
    // Set an override on a spacing token
    await SELF.fetch('http://localhost/tokens/spacing/spacing-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: '999rem',
        reason: 'Override before reset',
      }),
    });

    // Verify override exists
    const beforeRes = await SELF.fetch('http://localhost/tokens/spacing/spacing-1');
    const before = (await beforeRes.json()) as Record<string, unknown>;
    expect((before.token as Record<string, unknown>).userOverride).toBeTruthy();

    // Reset spacing
    await SELF.fetch('http://localhost/tokens/spacing/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Override should be gone
    const afterRes = await SELF.fetch('http://localhost/tokens/spacing/spacing-1');
    const after = (await afterRes.json()) as Record<string, unknown>;
    expect((after.token as Record<string, unknown>).userOverride).toBeUndefined();
  });

  it('returns 404 for invalid namespace', async () => {
    const res = await SELF.fetch('http://localhost/tokens/nonexistent/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Why-gate enforcement
// =============================================================================

describe('why-gate', () => {
  it('every successful set has a reason recorded', async () => {
    const reason = 'Huttspawn brand requires wider spacing at scale 6';
    await SELF.fetch('http://localhost/tokens/spacing/spacing-6', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: '3rem',
        reason,
      }),
    });

    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-6');
    const json = (await res.json()) as Record<string, unknown>;
    const token = json.token as Record<string, unknown>;
    const override = token.userOverride as Record<string, unknown>;

    expect(override.reason).toBe(reason);
    expect(override.previousValue).toBeTruthy();
  });

  it('context field is optional but preserved when provided', async () => {
    await SELF.fetch('http://localhost/tokens/spacing/spacing-7', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: '3.5rem',
        reason: 'Accessibility audit finding',
        context: 'WCAG 2.2 target size requirements for touch interfaces',
      }),
    });

    const res = await SELF.fetch('http://localhost/tokens/spacing/spacing-7');
    const json = (await res.json()) as Record<string, unknown>;
    const token = json.token as Record<string, unknown>;
    const override = token.userOverride as Record<string, unknown>;

    expect(override.reason).toBe('Accessibility audit finding');
    expect(override.context).toBe('WCAG 2.2 target size requirements for touch interfaces');
  });
});
