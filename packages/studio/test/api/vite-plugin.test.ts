/**
 * Vite Plugin Unit Tests
 *
 * Tests plugin factory, Zod validation, and error handling.
 * Integration with actual Vite server is tested manually.
 */

import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildColorValue } from '@rafters/color-utils';
import { saveRegistryToDir, TokenRegistry } from '@rafters/design-tokens';
import type { Token } from '@rafters/shared';
import { ColorReferenceSchema, ColorValueSchema, TokenSchema } from '@rafters/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { zocker } from 'zocker';
import { z } from 'zod';

const TEST_TMP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'tmp');

import {
  handleBuildColor,
  handleGetTokens,
  handlePostToken,
  handlePostTokens,
  studioApiPlugin,
  TokenPatchSchema,
} from '../../src/api/vite-plugin';

// Replicate schemas from vite-plugin.ts to test validation logic
const SetTokenMessageSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), ColorValueSchema, ColorReferenceSchema]),
  persist: z.boolean().optional(),
});

const TokenResponseSchema = z.object({
  ok: z.literal(true),
  token: TokenSchema,
});

const TokensResponseSchema = z.object({
  tokens: z.array(TokenSchema),
  initialized: z.boolean(),
});

const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

type MockResponse = import('node:http').ServerResponse & {
  _statusCode: number;
  _body: string;
  _headers: Record<string, string>;
};

function createMockRequest(
  body: unknown,
  opts?: { method?: string; url?: string },
): import('node:http').IncomingMessage {
  const req = new EventEmitter() as import('node:http').IncomingMessage & {
    method?: string;
    url?: string;
  };
  if (opts?.method) req.method = opts.method;
  if (opts?.url) req.url = opts.url;
  setTimeout(() => {
    req.emit('data', Buffer.from(JSON.stringify(body)));
    req.emit('end');
  }, 0);
  return req;
}

function createMockResponse(): MockResponse {
  const res = {
    _statusCode: 200,
    _body: '',
    _headers: {} as Record<string, string>,
    headersSent: false,
    set statusCode(code: number) {
      this._statusCode = code;
    },
    get statusCode() {
      return this._statusCode;
    },
    setHeader(name: string, value: string) {
      this._headers[name] = value;
    },
    end(body?: string) {
      this._body = body ?? '';
      this.headersSent = true;
    },
  };
  return res as MockResponse;
}

describe('studioApiPlugin', () => {
  describe('plugin factory', () => {
    it('exports a function', () => {
      expect(typeof studioApiPlugin).toBe('function');
    });

    it('returns plugin with correct name', () => {
      const plugin = studioApiPlugin();
      expect(plugin.name).toBe('rafters-studio-api');
    });

    it('has configureServer hook', () => {
      const plugin = studioApiPlugin();
      expect(typeof plugin.configureServer).toBe('function');
    });
  });

  describe('SetTokenMessageSchema validation', () => {
    it('accepts valid string value', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: 'oklch(0.5 0.2 250)',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid ColorReference value', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: { family: 'neutral', position: '500' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts persist: true', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: 'red',
        persist: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.persist).toBe(true);
      }
    });

    it('accepts persist: false', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: 'red',
        persist: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.persist).toBe(false);
      }
    });

    it('defaults persist to undefined when not provided', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: 'red',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.persist).toBeUndefined();
      }
    });

    it('rejects empty name', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: '',
        value: 'red',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing name', () => {
      const result = SetTokenMessageSchema.safeParse({
        value: 'red',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing value', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
      });
      expect(result.success).toBe(false);
    });

    it('rejects null value', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: null,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid ColorReference (missing family)', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: { position: '500' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid ColorReference (missing position)', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: { family: 'neutral' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-string persist', () => {
      const result = SetTokenMessageSchema.safeParse({
        name: 'primary',
        value: 'red',
        persist: 'true',
      });
      expect(result.success).toBe(false);
    });

    it('rejects completely invalid payload', () => {
      const result = SetTokenMessageSchema.safeParse('not an object');
      expect(result.success).toBe(false);
    });

    it('rejects array payload', () => {
      const result = SetTokenMessageSchema.safeParse([{ name: 'test', value: 'red' }]);
      expect(result.success).toBe(false);
    });
  });

  describe('Response schema validation', () => {
    describe('TokenResponseSchema', () => {
      it('accepts valid token response', () => {
        const result = TokenResponseSchema.safeParse({
          ok: true,
          token: {
            name: 'primary',
            value: { family: 'neutral', position: '500' },
            category: 'color',
            namespace: 'semantic',
            userOverride: null,
          },
        });
        expect(result.success).toBe(true);
      });

      it('rejects response without ok field', () => {
        const result = TokenResponseSchema.safeParse({
          token: {
            name: 'primary',
            value: 'red',
            category: 'color',
            namespace: 'semantic',
            userOverride: null,
          },
        });
        expect(result.success).toBe(false);
      });

      it('rejects response with ok: false', () => {
        const result = TokenResponseSchema.safeParse({
          ok: false,
          token: {
            name: 'primary',
            value: 'red',
            category: 'color',
            namespace: 'semantic',
            userOverride: null,
          },
        });
        expect(result.success).toBe(false);
      });

      it('rejects response with invalid token', () => {
        const result = TokenResponseSchema.safeParse({
          ok: true,
          token: { name: 'primary' }, // missing required fields
        });
        expect(result.success).toBe(false);
      });
    });

    describe('TokensResponseSchema', () => {
      it('accepts valid tokens list response', () => {
        const result = TokensResponseSchema.safeParse({
          tokens: [
            {
              name: 'primary',
              value: { family: 'neutral', position: '500' },
              category: 'color',
              namespace: 'semantic',
              userOverride: null,
            },
          ],
          initialized: true,
        });
        expect(result.success).toBe(true);
      });

      it('accepts empty tokens array', () => {
        const result = TokensResponseSchema.safeParse({
          tokens: [],
          initialized: false,
        });
        expect(result.success).toBe(true);
      });

      it('rejects response without initialized field', () => {
        const result = TokensResponseSchema.safeParse({
          tokens: [],
        });
        expect(result.success).toBe(false);
      });
    });

    describe('ErrorResponseSchema', () => {
      it('accepts valid error response', () => {
        const result = ErrorResponseSchema.safeParse({
          ok: false,
          error: 'Token not found',
        });
        expect(result.success).toBe(true);
      });

      it('rejects error response with ok: true', () => {
        const result = ErrorResponseSchema.safeParse({
          ok: true,
          error: 'Something went wrong',
        });
        expect(result.success).toBe(false);
      });

      it('rejects error response without error message', () => {
        const result = ErrorResponseSchema.safeParse({
          ok: false,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('URL parsing logic', () => {
    // Test the pathname extraction logic used in the middleware
    function extractPathname(url: string): string {
      return new URL(url, 'http://localhost').pathname;
    }

    function extractTokenName(pathname: string): string | null {
      const match = pathname.match(/^\/api\/tokens\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : null;
    }

    describe('pathname extraction', () => {
      it('extracts pathname from simple URL', () => {
        expect(extractPathname('/api/tokens')).toBe('/api/tokens');
      });

      it('strips query string from URL', () => {
        expect(extractPathname('/api/tokens?foo=bar')).toBe('/api/tokens');
      });

      it('strips query string from token URL', () => {
        expect(extractPathname('/api/tokens/primary?foo=bar')).toBe('/api/tokens/primary');
      });

      it('handles complex query strings', () => {
        expect(extractPathname('/api/tokens/primary?foo=bar&baz=qux')).toBe('/api/tokens/primary');
      });
    });

    describe('token name extraction', () => {
      it('extracts simple token name', () => {
        expect(extractTokenName('/api/tokens/primary')).toBe('primary');
      });

      it('extracts token name with dash', () => {
        expect(extractTokenName('/api/tokens/primary-500')).toBe('primary-500');
      });

      it('decodes URL-encoded token name', () => {
        expect(extractTokenName('/api/tokens/card-foreground')).toBe('card-foreground');
      });

      it('decodes percent-encoded spaces', () => {
        expect(extractTokenName('/api/tokens/my%20token')).toBe('my token');
      });

      it('returns null for /api/tokens (no name)', () => {
        expect(extractTokenName('/api/tokens')).toBe(null);
      });

      it('returns null for non-matching paths', () => {
        expect(extractTokenName('/api/other/primary')).toBe(null);
      });
    });

    describe('namespace query param extraction', () => {
      function extractNamespace(url: string): string | null {
        return new URL(url, 'http://localhost').searchParams.get('namespace');
      }

      it('extracts namespace from query string', () => {
        expect(extractNamespace('/api/tokens?namespace=color')).toBe('color');
      });

      it('returns null when no namespace param', () => {
        expect(extractNamespace('/api/tokens')).toBe(null);
      });

      it('returns null when namespace is empty', () => {
        expect(extractNamespace('/api/tokens?namespace=')).toBe('');
      });

      it('handles namespace with other params', () => {
        expect(extractNamespace('/api/tokens?foo=bar&namespace=semantic&baz=qux')).toBe('semantic');
      });

      it('extracts namespace with special characters', () => {
        expect(extractNamespace('/api/tokens?namespace=my-namespace')).toBe('my-namespace');
      });
    });

    describe('malformed URL encoding', () => {
      it('throws on invalid percent encoding', () => {
        expect(() => decodeURIComponent('%E0%A4%A')).toThrow();
      });

      it('throws on incomplete percent encoding', () => {
        expect(() => decodeURIComponent('%')).toThrow();
      });

      it('throws on invalid UTF-8 sequence', () => {
        expect(() => decodeURIComponent('%C0%C1')).toThrow();
      });
    });
  });

  describe('TokenPatchSchema validation (POST /api/tokens/:name)', () => {
    describe('value field (required)', () => {
      it('accepts string value', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.5 0.2 250)',
        });
        expect(result.success).toBe(true);
      });

      it('accepts ColorReference value', () => {
        const result = TokenPatchSchema.safeParse({
          value: { family: 'neutral', position: '500' },
        });
        expect(result.success).toBe(true);
      });

      it('accepts ColorValue object', () => {
        const result = TokenPatchSchema.safeParse({
          value: {
            name: 'ocean-blue',
            scale: [
              { l: 0.98, c: 0.01, h: 250 }, // 50
              { l: 0.95, c: 0.02, h: 250 }, // 100
              { l: 0.85, c: 0.08, h: 250 }, // 200
              { l: 0.75, c: 0.12, h: 250 }, // 300
              { l: 0.65, c: 0.16, h: 250 }, // 400
              { l: 0.55, c: 0.18, h: 250 }, // 500
              { l: 0.45, c: 0.16, h: 250 }, // 600
              { l: 0.35, c: 0.14, h: 250 }, // 700
              { l: 0.25, c: 0.1, h: 250 }, // 800
              { l: 0.15, c: 0.06, h: 250 }, // 900
              { l: 0.08, c: 0.03, h: 250 }, // 950
            ],
          },
        });
        expect(result.success).toBe(true);
      });

      it('rejects missing value', () => {
        const result = TokenPatchSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('rejects null value', () => {
        const result = TokenPatchSchema.safeParse({ value: null });
        expect(result.success).toBe(false);
      });

      it('rejects number value', () => {
        const result = TokenPatchSchema.safeParse({ value: 42 });
        expect(result.success).toBe(false);
      });

      it('rejects incomplete ColorReference (missing family)', () => {
        const result = TokenPatchSchema.safeParse({
          value: { position: '500' },
        });
        expect(result.success).toBe(false);
      });

      it('rejects incomplete ColorReference (missing position)', () => {
        const result = TokenPatchSchema.safeParse({
          value: { family: 'neutral' },
        });
        expect(result.success).toBe(false);
      });
    });

    describe('optional enum fields', () => {
      it('accepts valid trustLevel', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.5 0.2 250)',
          trustLevel: 'critical',
        });
        expect(result.success).toBe(true);
      });

      it('rejects invalid trustLevel', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.5 0.2 250)',
          trustLevel: 'maximum',
        });
        expect(result.success).toBe(false);
      });

      it('accepts valid elevationLevel', () => {
        const result = TokenPatchSchema.safeParse({
          value: '40',
          elevationLevel: 'modal',
        });
        expect(result.success).toBe(true);
      });

      it('rejects invalid elevationLevel', () => {
        const result = TokenPatchSchema.safeParse({
          value: '40',
          elevationLevel: 'top',
        });
        expect(result.success).toBe(false);
      });

      it('accepts valid motionIntent', () => {
        const result = TokenPatchSchema.safeParse({
          value: '150ms',
          motionIntent: 'enter',
        });
        expect(result.success).toBe(true);
      });

      it('rejects invalid motionIntent', () => {
        const result = TokenPatchSchema.safeParse({
          value: '150ms',
          motionIntent: 'fast',
        });
        expect(result.success).toBe(false);
      });

      it('accepts valid accessibilityLevel', () => {
        const result = TokenPatchSchema.safeParse({
          value: '2px solid blue',
          accessibilityLevel: 'AAA',
        });
        expect(result.success).toBe(true);
      });

      it('rejects invalid accessibilityLevel', () => {
        const result = TokenPatchSchema.safeParse({
          value: '2px solid blue',
          accessibilityLevel: 'A',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('userOverride field', () => {
      it('accepts valid userOverride', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.6 0.2 250)',
          userOverride: {
            previousValue: 'oklch(0.5 0.2 250)',
            reason: 'Brand requirement',
          },
        });
        expect(result.success).toBe(true);
      });

      it('accepts userOverride with context', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.6 0.2 250)',
          userOverride: {
            previousValue: 'oklch(0.5 0.2 250)',
            reason: 'Brand requirement',
            context: 'Q1 rebrand',
          },
        });
        expect(result.success).toBe(true);
      });

      it('rejects userOverride without reason', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.6 0.2 250)',
          userOverride: {
            previousValue: 'oklch(0.5 0.2 250)',
          },
        });
        expect(result.success).toBe(false);
      });

      it('rejects userOverride without previousValue', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.6 0.2 250)',
          userOverride: {
            reason: 'Brand requirement',
          },
        });
        expect(result.success).toBe(false);
      });
    });

    describe('description field', () => {
      it('accepts description', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.5 0.2 250)',
          description: 'Primary brand color',
        });
        expect(result.success).toBe(true);
      });

      it('rejects non-string description', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.5 0.2 250)',
          description: 123,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('combined fields', () => {
      it('accepts multiple optional fields', () => {
        const result = TokenPatchSchema.safeParse({
          value: { family: 'red', position: '600' },
          trustLevel: 'critical',
          description: 'Destructive action color',
          userOverride: {
            previousValue: { family: 'red', position: '500' },
            reason: 'Need higher contrast for accessibility',
          },
        });
        expect(result.success).toBe(true);
      });

      it('strips unknown fields', () => {
        const result = TokenPatchSchema.safeParse({
          value: 'oklch(0.5 0.2 250)',
          unknownField: 'should be ignored',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect('unknownField' in result.data).toBe(false);
        }
      });
    });
  });

  describe('handlePostToken integration', () => {
    // Create test token
    const testToken: Token = {
      name: 'test-token',
      value: 'oklch(0.5 0.2 250)',
      category: 'color',
      namespace: 'color',
      userOverride: null,
    };

    it('returns 400 when POSTing a partial body to a non-existent token (create requires full schema)', async () => {
      // POST on a non-existent name dispatches to the CREATE branch, which
      // requires namespace + category + value + userOverride.reason. A
      // partial body fails create-validation -> 400. To create a new token
      // through this endpoint, send a full body.
      const registry = new TokenRegistry([]);
      const req = createMockRequest({ value: 'new-value' });
      const res = createMockResponse();

      await handlePostToken(req, res, 'non-existent', registry);

      expect(res._statusCode).toBe(400);
      const body = JSON.parse(res._body);
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(/namespace|userOverride/);
    });

    it('returns 400 for invalid JSON body', async () => {
      const registry = new TokenRegistry([testToken]);
      const req = new EventEmitter() as import('node:http').IncomingMessage;
      const res = createMockResponse();

      // Simulate invalid JSON
      setTimeout(() => {
        req.emit('data', Buffer.from('not valid json'));
        req.emit('end');
      }, 0);

      await handlePostToken(req, res, 'test-token', registry);

      expect(res._statusCode).toBe(400);
      expect(JSON.parse(res._body).ok).toBe(false);
      expect(JSON.parse(res._body).error).toContain('Invalid JSON');
    });

    it('returns 400 for missing value field', async () => {
      const registry = new TokenRegistry([testToken]);
      const req = createMockRequest({ description: 'no value' });
      const res = createMockResponse();

      await handlePostToken(req, res, 'test-token', registry);

      expect(res._statusCode).toBe(400);
      expect(JSON.parse(res._body).ok).toBe(false);
    });

    it('returns 400 for invalid enum value', async () => {
      // Use semantic token - trustLevel is only valid for semantic namespace
      const semanticToken: Token = {
        name: 'semantic-test',
        value: { family: 'blue', position: '500' },
        category: 'color',
        namespace: 'semantic',
        userOverride: null,
      };
      const registry = new TokenRegistry([semanticToken]);
      const req = createMockRequest({
        value: { family: 'blue', position: '600' },
        trustLevel: 'invalid-level',
      });
      const res = createMockResponse();

      await handlePostToken(req, res, 'semantic-test', registry);

      expect(res._statusCode).toBe(400);
      expect(JSON.parse(res._body).ok).toBe(false);
    });

    it('successfully updates token value', async () => {
      const registry = new TokenRegistry([testToken]);
      const req = createMockRequest({ value: 'oklch(0.7 0.3 260)' });
      const res = createMockResponse();

      await handlePostToken(req, res, 'test-token', registry);

      expect(res._statusCode).toBe(200);
      const response = JSON.parse(res._body);
      expect(response.ok).toBe(true);
      expect(response.token.value).toBe('oklch(0.7 0.3 260)');
    });

    it('rebakes accessibility when a scale-bearing family value is set (#1643)', async () => {
      const familyToken: Token = {
        name: 'mud',
        value: buildColorValue({ l: 0.45, c: 0.08, h: 60, alpha: 1 }),
        category: 'color',
        namespace: 'color',
        userOverride: null,
      };
      const registry = new TokenRegistry([familyToken]);
      // A designer pastes a new scale: bare {name, scale}, no accessibility.
      const bare = buildColorValue({ l: 0.55, c: 0.12, h: 200, alpha: 1 });
      const req = createMockRequest({ value: { name: bare.name, scale: bare.scale } });
      const res = createMockResponse();

      await handlePostToken(req, res, 'mud', registry);

      expect(res._statusCode).toBe(200);
      const response = JSON.parse(res._body);
      expect(response.ok).toBe(true);
      // The guard must have re-derived the WCAG matrices for the NEW scale --
      // without this, contrast/state/invert selection starves downstream.
      const value = response.token.value;
      expect(value.accessibility?.wcagAAA?.normal?.length).toBeGreaterThan(0);
      expect(value.accessibility?.onBlack?.contrastRatio).toBeGreaterThan(1);
      // Persisted in the registry, not just echoed.
      const stored = registry.get('mud');
      const storedValue = stored?.value as { accessibility?: { wcagAAA?: { normal: number[][] } } };
      expect(storedValue.accessibility?.wcagAAA?.normal?.length).toBeGreaterThan(0);
    });

    it('successfully updates token with optional fields', async () => {
      // Use semantic token - trustLevel is only valid for semantic namespace
      const semanticToken: Token = {
        name: 'semantic-test',
        value: { family: 'blue', position: '500' },
        category: 'color',
        namespace: 'semantic',
        userOverride: null,
      };
      const registry = new TokenRegistry([semanticToken]);
      const req = createMockRequest({
        value: { family: 'red', position: '600' },
        description: 'Updated semantic',
        trustLevel: 'high',
      });
      const res = createMockResponse();

      await handlePostToken(req, res, 'semantic-test', registry);

      expect(res._statusCode).toBe(200);
      const response = JSON.parse(res._body);
      expect(response.ok).toBe(true);
      expect(response.token.value).toEqual({ family: 'red', position: '600' });
      expect(response.token.description).toBe('Updated semantic');
      expect(response.token.trustLevel).toBe('high');
    });

    it('persists updated token in registry', async () => {
      const registry = new TokenRegistry([testToken]);
      const req = createMockRequest({
        value: 'oklch(0.8 0.1 270)',
        description: 'Persisted update',
      });
      const res = createMockResponse();

      await handlePostToken(req, res, 'test-token', registry);

      // Verify token is updated in registry
      const updatedToken = registry.get('test-token');
      expect(updatedToken?.value).toBe('oklch(0.8 0.1 270)');
      expect(updatedToken?.description).toBe('Persisted update');
    });

    it('preserves existing token fields not in patch', async () => {
      const tokenWithFields: Token = {
        ...testToken,
        description: 'Original description',
        trustLevel: 'medium',
        userOverride: null,
      };
      const registry = new TokenRegistry([tokenWithFields]);
      const req = createMockRequest({ value: 'oklch(0.6 0.2 250)' });
      const res = createMockResponse();

      await handlePostToken(req, res, 'test-token', registry);

      expect(res._statusCode).toBe(200);
      const response = JSON.parse(res._body);
      expect(response.token.value).toBe('oklch(0.6 0.2 250)');
      expect(response.token.description).toBe('Original description');
      expect(response.token.trustLevel).toBe('medium');
    });

    it('handles ColorReference value', async () => {
      const semanticToken: Token = {
        name: 'primary',
        value: { family: 'neutral', position: '500' },
        category: 'color',
        namespace: 'semantic',
        userOverride: null,
      };
      const registry = new TokenRegistry([semanticToken]);
      const req = createMockRequest({
        value: { family: 'blue', position: '600' },
      });
      const res = createMockResponse();

      await handlePostToken(req, res, 'primary', registry);

      expect(res._statusCode).toBe(200);
      const response = JSON.parse(res._body);
      expect(response.token.value).toEqual({ family: 'blue', position: '600' });
    });
  });

  describe('namespace-specific validation', () => {
    describe('color namespace', () => {
      const colorToken: Token = {
        name: 'color-test',
        value: 'oklch(0.5 0.2 250)',
        category: 'color',
        namespace: 'color',
        userOverride: null,
      };

      it('accepts oklch string value', async () => {
        const registry = new TokenRegistry([colorToken]);
        const req = createMockRequest({ value: 'oklch(0.7 0.3 260)' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'color-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('rejects non-oklch string value', async () => {
        const registry = new TokenRegistry([colorToken]);
        const req = createMockRequest({ value: 'red' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'color-test', registry);

        expect(res._statusCode).toBe(400);
        expect(JSON.parse(res._body).error).toContain('oklch');
      });

      it('rejects invalid scalePosition', async () => {
        const registry = new TokenRegistry([colorToken]);
        const req = createMockRequest({ value: 'oklch(0.5 0.2 250)', scalePosition: 15 });
        const res = createMockResponse();

        await handlePostToken(req, res, 'color-test', registry);

        expect(res._statusCode).toBe(400);
      });
    });

    describe('semantic namespace', () => {
      const semanticToken: Token = {
        name: 'semantic-test',
        value: { family: 'blue', position: '500' },
        category: 'color',
        namespace: 'semantic',
        userOverride: null,
      };

      it('accepts ColorReference value', async () => {
        const registry = new TokenRegistry([semanticToken]);
        const req = createMockRequest({ value: { family: 'red', position: '600' } });
        const res = createMockResponse();

        await handlePostToken(req, res, 'semantic-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('rejects string value (must be ColorReference)', async () => {
        const registry = new TokenRegistry([semanticToken]);
        const req = createMockRequest({ value: 'oklch(0.5 0.2 250)' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'semantic-test', registry);

        expect(res._statusCode).toBe(400);
      });

      it('accepts valid trustLevel', async () => {
        const registry = new TokenRegistry([semanticToken]);
        const req = createMockRequest({
          value: { family: 'blue', position: '500' },
          trustLevel: 'critical',
        });
        const res = createMockResponse();

        await handlePostToken(req, res, 'semantic-test', registry);

        expect(res._statusCode).toBe(200);
        expect(JSON.parse(res._body).token.trustLevel).toBe('critical');
      });

      it('rejects invalid trustLevel', async () => {
        const registry = new TokenRegistry([semanticToken]);
        const req = createMockRequest({
          value: { family: 'blue', position: '500' },
          trustLevel: 'extreme',
        });
        const res = createMockResponse();

        await handlePostToken(req, res, 'semantic-test', registry);

        expect(res._statusCode).toBe(400);
      });
    });

    describe('spacing namespace', () => {
      const spacingToken: Token = {
        name: 'spacing-test',
        value: '1rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      };

      it('accepts rem value', async () => {
        const registry = new TokenRegistry([spacingToken]);
        const req = createMockRequest({ value: '0.5rem' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'spacing-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts negative rem value', async () => {
        const registry = new TokenRegistry([spacingToken]);
        const req = createMockRequest({ value: '-0.25rem' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'spacing-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('rejects px value', async () => {
        const registry = new TokenRegistry([spacingToken]);
        const req = createMockRequest({ value: '16px' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'spacing-test', registry);

        expect(res._statusCode).toBe(400);
        expect(JSON.parse(res._body).error).toContain('rem');
      });
    });

    describe('depth namespace', () => {
      const depthToken: Token = {
        name: 'depth-test',
        value: '10',
        category: 'depth',
        namespace: 'depth',
        userOverride: null,
      };

      it('accepts numeric z-index', async () => {
        const registry = new TokenRegistry([depthToken]);
        const req = createMockRequest({ value: '50' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'depth-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts negative z-index', async () => {
        const registry = new TokenRegistry([depthToken]);
        const req = createMockRequest({ value: '-1' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'depth-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('rejects non-numeric value', async () => {
        const registry = new TokenRegistry([depthToken]);
        const req = createMockRequest({ value: 'auto' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'depth-test', registry);

        expect(res._statusCode).toBe(400);
        expect(JSON.parse(res._body).error).toContain('numeric');
      });

      it('accepts valid elevationLevel', async () => {
        const registry = new TokenRegistry([depthToken]);
        const req = createMockRequest({ value: '40', elevationLevel: 'modal' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'depth-test', registry);

        expect(res._statusCode).toBe(200);
        expect(JSON.parse(res._body).token.elevationLevel).toBe('modal');
      });

      it('rejects invalid elevationLevel', async () => {
        const registry = new TokenRegistry([depthToken]);
        const req = createMockRequest({ value: '40', elevationLevel: 'top' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'depth-test', registry);

        expect(res._statusCode).toBe(400);
      });
    });

    describe('motion namespace', () => {
      const motionToken: Token = {
        name: 'motion-test',
        value: '200ms',
        category: 'motion',
        namespace: 'motion',
        userOverride: null,
      };

      it('accepts ms duration', async () => {
        const registry = new TokenRegistry([motionToken]);
        const req = createMockRequest({ value: '150ms' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'motion-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts cubic-bezier easing', async () => {
        const registry = new TokenRegistry([motionToken]);
        const req = createMockRequest({ value: 'cubic-bezier(0.4, 0, 0.2, 1)' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'motion-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('rejects invalid duration format', async () => {
        const registry = new TokenRegistry([motionToken]);
        const req = createMockRequest({ value: '200' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'motion-test', registry);

        expect(res._statusCode).toBe(400);
      });

      it('accepts valid motionIntent', async () => {
        const registry = new TokenRegistry([motionToken]);
        const req = createMockRequest({ value: '200ms', motionIntent: 'enter' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'motion-test', registry);

        expect(res._statusCode).toBe(200);
        expect(JSON.parse(res._body).token.motionIntent).toBe('enter');
      });
    });

    describe('radius namespace', () => {
      const radiusToken: Token = {
        name: 'radius-test',
        value: '0.5rem',
        category: 'radius',
        namespace: 'radius',
        userOverride: null,
      };

      it('accepts rem value', async () => {
        const registry = new TokenRegistry([radiusToken]);
        const req = createMockRequest({ value: '1rem' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'radius-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts 0 for sharp corners', async () => {
        const registry = new TokenRegistry([radiusToken]);
        const req = createMockRequest({ value: '0' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'radius-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts 9999px for pill shape', async () => {
        const registry = new TokenRegistry([radiusToken]);
        const req = createMockRequest({ value: '9999px' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'radius-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('rejects arbitrary px values', async () => {
        const registry = new TokenRegistry([radiusToken]);
        const req = createMockRequest({ value: '8px' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'radius-test', registry);

        expect(res._statusCode).toBe(400);
      });
    });

    describe('focus namespace', () => {
      const focusToken: Token = {
        name: 'focus-test',
        value: '2px solid blue',
        category: 'focus',
        namespace: 'focus',
        userOverride: null,
      };

      it('accepts focus ring value', async () => {
        const registry = new TokenRegistry([focusToken]);
        const req = createMockRequest({ value: '3px solid var(--primary)' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'focus-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts valid accessibilityLevel', async () => {
        const registry = new TokenRegistry([focusToken]);
        const req = createMockRequest({ value: '2px solid blue', accessibilityLevel: 'AAA' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'focus-test', registry);

        expect(res._statusCode).toBe(200);
        expect(JSON.parse(res._body).token.accessibilityLevel).toBe('AAA');
      });

      it('rejects invalid accessibilityLevel', async () => {
        const registry = new TokenRegistry([focusToken]);
        const req = createMockRequest({ value: '2px solid blue', accessibilityLevel: 'A' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'focus-test', registry);

        expect(res._statusCode).toBe(400);
      });
    });

    describe('typography namespace', () => {
      const typographyToken: Token = {
        name: 'typography-test',
        value: '1rem',
        category: 'typography',
        namespace: 'typography',
        userOverride: null,
      };

      it('accepts string value', async () => {
        const registry = new TokenRegistry([typographyToken]);
        const req = createMockRequest({ value: '1.25rem' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'typography-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts lineHeight', async () => {
        const registry = new TokenRegistry([typographyToken]);
        const req = createMockRequest({ value: '1rem', lineHeight: '1.5' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'typography-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('rejects empty value', async () => {
        const registry = new TokenRegistry([typographyToken]);
        const req = createMockRequest({ value: '' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'typography-test', registry);

        expect(res._statusCode).toBe(400);
      });
    });

    describe('breakpoint namespace', () => {
      const breakpointToken: Token = {
        name: 'breakpoint-test',
        value: '768px',
        category: 'breakpoint',
        namespace: 'breakpoint',
        userOverride: null,
      };

      it('accepts px value', async () => {
        const registry = new TokenRegistry([breakpointToken]);
        const req = createMockRequest({ value: '1024px' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'breakpoint-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts rem value', async () => {
        const registry = new TokenRegistry([breakpointToken]);
        const req = createMockRequest({ value: '48rem' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'breakpoint-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('rejects invalid format', async () => {
        const registry = new TokenRegistry([breakpointToken]);
        const req = createMockRequest({ value: 'large' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'breakpoint-test', registry);

        expect(res._statusCode).toBe(400);
      });
    });

    describe('shadow namespace', () => {
      const shadowToken: Token = {
        name: 'shadow-test',
        value: '0 4px 6px rgba(0,0,0,0.1)',
        category: 'shadow',
        namespace: 'shadow',
        userOverride: null,
      };

      it('accepts CSS shadow string', async () => {
        const registry = new TokenRegistry([shadowToken]);
        const req = createMockRequest({ value: '0 8px 16px rgba(0,0,0,0.2)' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'shadow-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts shadowToken reference', async () => {
        const registry = new TokenRegistry([shadowToken]);
        const req = createMockRequest({ value: '0 4px 6px black', shadowToken: 'shadow-md' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'shadow-test', registry);

        expect(res._statusCode).toBe(200);
      });
    });

    describe('elevation namespace', () => {
      const elevationToken: Token = {
        name: 'elevation-test',
        value: 'var(--depth-raised)',
        category: 'elevation',
        namespace: 'elevation',
        userOverride: null,
      };

      it('accepts string value', async () => {
        const registry = new TokenRegistry([elevationToken]);
        const req = createMockRequest({ value: 'var(--depth-modal)' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'elevation-test', registry);

        expect(res._statusCode).toBe(200);
      });

      it('accepts elevationLevel', async () => {
        const registry = new TokenRegistry([elevationToken]);
        const req = createMockRequest({ value: 'var(--depth-overlay)', elevationLevel: 'overlay' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'elevation-test', registry);

        expect(res._statusCode).toBe(200);
        expect(JSON.parse(res._body).token.elevationLevel).toBe('overlay');
      });
    });

    describe('unknown namespace fallback', () => {
      const unknownToken: Token = {
        name: 'unknown-test',
        value: 'any-value',
        category: 'custom',
        namespace: 'custom-namespace',
        userOverride: null,
      };

      it('falls back to TokenPatchSchema for unknown namespace', async () => {
        const registry = new TokenRegistry([unknownToken]);
        const req = createMockRequest({ value: 'new-value', description: 'Updated' });
        const res = createMockResponse();

        await handlePostToken(req, res, 'unknown-test', registry);

        expect(res._statusCode).toBe(200);
        expect(JSON.parse(res._body).token.value).toBe('new-value');
        expect(JSON.parse(res._body).token.description).toBe('Updated');
      });
    });
  });

  describe('handlePostTokens batch integration', () => {
    // Generate test tokens using zocker
    const generateColorToken = (name: string): Token => ({
      name,
      value: `oklch(0.${Math.floor(Math.random() * 9) + 1} 0.2 ${Math.floor(Math.random() * 360)})`,
      category: 'color',
      namespace: 'color',
      userOverride: null,
    });

    // Schema for batch response validation
    const BatchResponseSchema = z.object({
      tokens: z.array(TokenSchema),
      initialized: z.boolean(),
    });

    const BatchErrorSchema = z.object({
      ok: z.literal(false),
      error: z.string(),
    });

    it('returns 400 for invalid JSON body', async () => {
      const registry = new TokenRegistry([]);
      const req = new EventEmitter() as import('node:http').IncomingMessage;
      const res = createMockResponse();

      setTimeout(() => {
        req.emit('data', Buffer.from('not valid json'));
        req.emit('end');
      }, 0);

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(400);
      const response = BatchErrorSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.error).toContain('Invalid JSON');
      }
    });

    it('returns 400 for non-array body', async () => {
      const registry = new TokenRegistry([]);
      const req = createMockRequest({ name: 'not-an-array' });
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(400);
      const response = BatchErrorSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
    });

    it('returns 400 for invalid token in array', async () => {
      const token = generateColorToken('valid-token');
      const registry = new TokenRegistry([token]);
      const req = createMockRequest([
        { ...token, value: 'updated' },
        { name: 'missing-fields' }, // Invalid - missing required fields
      ]);
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(400);
      const response = BatchErrorSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
    });

    it('returns 404 when any token does not exist', async () => {
      const existingToken = generateColorToken('existing-token');
      const registry = new TokenRegistry([existingToken]);

      // Create a valid token that doesn't exist in registry
      const nonExistentToken = zocker(TokenSchema).generate();
      nonExistentToken.name = 'non-existent-token';

      const req = createMockRequest([{ ...existingToken, value: 'updated' }, nonExistentToken]);
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(404);
      const response = BatchErrorSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.error).toContain('non-existent-token');
      }
    });

    it('successfully updates single token in batch', async () => {
      const token = generateColorToken('single-token');
      const registry = new TokenRegistry([token]);
      const updatedToken = { ...token, value: 'oklch(0.8 0.3 180)' };
      const req = createMockRequest([updatedToken]);
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(200);
      const response = BatchResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(1);
        expect(response.data.tokens[0].value).toBe('oklch(0.8 0.3 180)');
        expect(response.data.initialized).toBe(true);
      }
    });

    it('successfully updates multiple tokens in batch', async () => {
      // Create color scale tokens (like a 11-position scale)
      const scaleTokens: Token[] = [];
      for (let i = 0; i <= 10; i++) {
        scaleTokens.push({
          name: `primary-${i * 100 || 50}`,
          value: `oklch(${0.98 - i * 0.08} 0.2 250)`,
          category: 'color',
          namespace: 'color',
          scalePosition: i,
          userOverride: null,
        });
      }

      const registry = new TokenRegistry(scaleTokens);

      // Update all tokens with new values
      const updatedTokens = scaleTokens.map((t, i) => ({
        ...t,
        value: `oklch(${0.95 - i * 0.07} 0.25 260)`,
      }));

      const req = createMockRequest(updatedTokens);
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(200);
      const response = BatchResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(11);
        expect(response.data.initialized).toBe(true);
      }
    });

    it('persists all tokens in registry after batch update', async () => {
      const tokens: Token[] = [
        generateColorToken('batch-token-1'),
        generateColorToken('batch-token-2'),
        generateColorToken('batch-token-3'),
      ];
      const registry = new TokenRegistry(tokens);

      const updatedTokens = tokens.map((t) => ({
        ...t,
        value: 'oklch(0.5 0.1 120)',
        description: 'Batch updated',
      }));

      const req = createMockRequest(updatedTokens);
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(200);

      // Verify all tokens updated in registry
      for (const token of tokens) {
        const updated = registry.get(token.name);
        expect(updated?.value).toBe('oklch(0.5 0.1 120)');
        expect(updated?.description).toBe('Batch updated');
      }
    });

    it('handles empty array (no-op)', async () => {
      const token = generateColorToken('unchanged-token');
      const registry = new TokenRegistry([token]);
      const req = createMockRequest([]);
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(200);
      const response = BatchResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(0);
      }

      // Original token should be unchanged
      expect(registry.get('unchanged-token')?.value).toBe(token.value);
    });

    it('validates tokens with zocker-generated data', async () => {
      // Generate valid tokens using zocker. Strip the binding: zocker
      // invents random plugin names, and TokenRegistry rightly throws
      // UnknownPluginError on plugins that are not registered -- a latent
      // flake whenever the RNG rolled a binding (exposed by #1643's test).
      const generatedToken = zocker(TokenSchema).generate();
      generatedToken.name = 'zocker-generated';
      generatedToken.binding = undefined;
      generatedToken.userOverride = null;

      const registry = new TokenRegistry([generatedToken]);

      // Update with new zocker-generated value
      const updatedToken = zocker(TokenSchema).generate();
      updatedToken.name = 'zocker-generated';
      updatedToken.binding = undefined;

      const req = createMockRequest([updatedToken]);
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(200);
      const response = BatchResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
    });

    it('updates tokens with optional fields preserved', async () => {
      const token: Token = {
        name: 'detailed-token',
        value: 'oklch(0.5 0.2 250)',
        category: 'color',
        namespace: 'semantic',
        trustLevel: 'high',
        description: 'Original description',
        userOverride: null,
      };
      const registry = new TokenRegistry([token]);

      // Update only value, keeping other fields
      const req = createMockRequest([
        {
          ...token,
          value: 'oklch(0.6 0.3 260)',
          trustLevel: 'critical',
        },
      ]);
      const res = createMockResponse();

      await handlePostTokens(req, res, registry);

      expect(res._statusCode).toBe(200);
      const response = BatchResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        const updatedToken = response.data.tokens[0];
        expect(updatedToken.value).toBe('oklch(0.6 0.3 260)');
        expect(updatedToken.trustLevel).toBe('critical');
        expect(updatedToken.description).toBe('Original description');
      }
    });
  });

  describe('handleGetTokens namespace filtering', () => {
    // Helper to create mock response
    function createMockResponse(): import('node:http').ServerResponse & {
      _statusCode: number;
      _body: string;
      _headers: Record<string, string>;
    } {
      const res = {
        _statusCode: 200,
        _body: '',
        _headers: {} as Record<string, string>,
        headersSent: false,
        set statusCode(code: number) {
          this._statusCode = code;
        },
        get statusCode() {
          return this._statusCode;
        },
        setHeader(name: string, value: string) {
          this._headers[name] = value;
        },
        end(body?: string) {
          this._body = body ?? '';
          this.headersSent = true;
        },
      };
      return res as import('node:http').ServerResponse & {
        _statusCode: number;
        _body: string;
        _headers: Record<string, string>;
      };
    }

    // Response schema for GET /api/tokens
    const GetTokensResponseSchema = z.object({
      tokens: z.array(TokenSchema),
      initialized: z.boolean(),
    });

    // Create test tokens with different namespaces
    const colorTokens: Token[] = [
      {
        name: 'primary-500',
        value: 'oklch(0.5 0.2 250)',
        category: 'color',
        namespace: 'color',
        userOverride: null,
      },
      {
        name: 'primary-600',
        value: 'oklch(0.4 0.2 250)',
        category: 'color',
        namespace: 'color',
        userOverride: null,
      },
    ];

    const semanticTokens: Token[] = [
      {
        name: 'primary',
        value: { family: 'blue', position: '500' },
        category: 'color',
        namespace: 'semantic',
        userOverride: null,
      },
      {
        name: 'destructive',
        value: { family: 'red', position: '600' },
        category: 'color',
        namespace: 'semantic',
        userOverride: null,
      },
    ];

    const spacingTokens: Token[] = [
      {
        name: 'spacing-1',
        value: '0.25rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      },
      {
        name: 'spacing-2',
        value: '0.5rem',
        category: 'spacing',
        namespace: 'spacing',
        userOverride: null,
      },
    ];

    const allTokens = [...colorTokens, ...semanticTokens, ...spacingTokens];

    it('returns all tokens when no namespace filter', () => {
      const registry = new TokenRegistry(allTokens);
      const res = createMockResponse();

      handleGetTokens('/api/tokens', res, registry, true);

      expect(res._statusCode).toBe(200);
      const response = GetTokensResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(6);
        expect(response.data.initialized).toBe(true);
      }
    });

    it('filters tokens by color namespace', () => {
      const registry = new TokenRegistry(allTokens);
      const res = createMockResponse();

      handleGetTokens('/api/tokens?namespace=color', res, registry, true);

      expect(res._statusCode).toBe(200);
      const response = GetTokensResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(2);
        expect(response.data.tokens.every((t) => t.namespace === 'color')).toBe(true);
      }
    });

    it('filters tokens by semantic namespace', () => {
      const registry = new TokenRegistry(allTokens);
      const res = createMockResponse();

      handleGetTokens('/api/tokens?namespace=semantic', res, registry, true);

      expect(res._statusCode).toBe(200);
      const response = GetTokensResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(2);
        expect(response.data.tokens.every((t) => t.namespace === 'semantic')).toBe(true);
      }
    });

    it('filters tokens by spacing namespace', () => {
      const registry = new TokenRegistry(allTokens);
      const res = createMockResponse();

      handleGetTokens('/api/tokens?namespace=spacing', res, registry, true);

      expect(res._statusCode).toBe(200);
      const response = GetTokensResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(2);
        expect(response.data.tokens.every((t) => t.namespace === 'spacing')).toBe(true);
      }
    });

    it('returns empty array for non-existent namespace', () => {
      const registry = new TokenRegistry(allTokens);
      const res = createMockResponse();

      handleGetTokens('/api/tokens?namespace=nonexistent', res, registry, true);

      expect(res._statusCode).toBe(200);
      const response = GetTokensResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(0);
      }
    });

    it('returns 400 for empty namespace parameter', () => {
      const registry = new TokenRegistry(allTokens);
      const res = createMockResponse();

      handleGetTokens('/api/tokens?namespace=', res, registry, true);

      expect(res._statusCode).toBe(400);
      const response = JSON.parse(res._body);
      expect(response.ok).toBe(false);
      expect(response.error).toContain('Invalid namespace');
    });

    it('ignores other query params and filters by namespace', () => {
      const registry = new TokenRegistry(allTokens);
      const res = createMockResponse();

      handleGetTokens('/api/tokens?foo=bar&namespace=color&baz=qux', res, registry, true);

      expect(res._statusCode).toBe(200);
      const response = GetTokensResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(2);
        expect(response.data.tokens.every((t) => t.namespace === 'color')).toBe(true);
      }
    });

    it('returns initialized=false when not initialized', () => {
      const registry = new TokenRegistry(allTokens);
      const res = createMockResponse();

      handleGetTokens('/api/tokens', res, registry, false);

      expect(res._statusCode).toBe(200);
      const response = GetTokensResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.initialized).toBe(false);
      }
    });

    it('works with zocker-generated tokens', () => {
      const generatedToken = zocker(TokenSchema).generate();
      generatedToken.namespace = 'zocker-namespace';
      // Same latent flake as the batch test: zocker invents plugin names.
      generatedToken.binding = undefined;
      generatedToken.userOverride = null;
      const registry = new TokenRegistry([generatedToken, ...colorTokens]);
      const res = createMockResponse();

      handleGetTokens('/api/tokens?namespace=zocker-namespace', res, registry, true);

      expect(res._statusCode).toBe(200);
      const response = GetTokensResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.tokens).toHaveLength(1);
        expect(response.data.tokens[0].namespace).toBe('zocker-namespace');
      }
    });
  });

  describe('handleBuildColor', () => {
    // Response schema
    const ColorBuildResponseSchema = z.object({
      ok: z.literal(true),
      colorValue: ColorValueSchema,
    });

    it('builds ColorValue from valid OKLCH', async () => {
      const req = createMockRequest({
        oklch: { l: 0.5, c: 0.15, h: 240 },
      });
      const res = createMockResponse();

      await handleBuildColor(req, res);

      expect(res._statusCode).toBe(200);
      const response = ColorBuildResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.colorValue.scale).toHaveLength(11);
        expect(response.data.colorValue.name).toBeDefined();
        expect(response.data.colorValue.harmonies).toBeDefined();
        expect(response.data.colorValue.accessibility).toBeDefined();
      }
    });

    it('builds ColorValue with options', async () => {
      const req = createMockRequest({
        oklch: { l: 0.6, c: 0.2, h: 180 },
        options: {
          token: 'primary',
          use: 'Brand primary color',
        },
      });
      const res = createMockResponse();

      await handleBuildColor(req, res);

      expect(res._statusCode).toBe(200);
      const response = ColorBuildResponseSchema.safeParse(JSON.parse(res._body));
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data.colorValue.token).toBe('primary');
        expect(response.data.colorValue.use).toBe('Brand primary color');
      }
    });

    it('returns 400 for missing oklch', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      await handleBuildColor(req, res);

      expect(res._statusCode).toBe(400);
      expect(JSON.parse(res._body).ok).toBe(false);
    });

    it('returns 400 for invalid oklch (missing l)', async () => {
      const req = createMockRequest({
        oklch: { c: 0.15, h: 240 },
      });
      const res = createMockResponse();

      await handleBuildColor(req, res);

      expect(res._statusCode).toBe(400);
      expect(JSON.parse(res._body).ok).toBe(false);
    });

    it('returns 400 for invalid JSON body', async () => {
      const req = new EventEmitter() as import('node:http').IncomingMessage;
      const res = createMockResponse();

      setTimeout(() => {
        req.emit('data', Buffer.from('not valid json'));
        req.emit('end');
      }, 0);

      await handleBuildColor(req, res);

      expect(res._statusCode).toBe(400);
      expect(JSON.parse(res._body).error).toContain('Invalid JSON');
    });

    it('generates accessibility metadata', async () => {
      const req = createMockRequest({
        oklch: { l: 0.5, c: 0.15, h: 240 },
      });
      const res = createMockResponse();

      await handleBuildColor(req, res);

      expect(res._statusCode).toBe(200);
      const response = JSON.parse(res._body);
      expect(response.colorValue.accessibility.onWhite).toBeDefined();
      expect(response.colorValue.accessibility.onBlack).toBeDefined();
      expect(response.colorValue.accessibility.apca).toBeDefined();
    });

    it('generates harmonies', async () => {
      const req = createMockRequest({
        oklch: { l: 0.5, c: 0.15, h: 240 },
      });
      const res = createMockResponse();

      await handleBuildColor(req, res);

      expect(res._statusCode).toBe(200);
      const response = JSON.parse(res._body);
      expect(response.colorValue.harmonies.complementary).toBeDefined();
      expect(response.colorValue.harmonies.triadic.length).toBeGreaterThanOrEqual(2);
      expect(response.colorValue.harmonies.analogous.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('REST middleware persistence (#1662)', () => {
    let tmpDir: string;

    beforeEach(async () => {
      mkdirSync(TEST_TMP_DIR, { recursive: true });
      tmpDir = await mkdtemp(join(TEST_TMP_DIR, 'rafters-test-'));
      const tokensDir = join(tmpDir, '.rafters', 'tokens');
      const outputDir = join(tmpDir, '.rafters', 'output');
      mkdirSync(tokensDir, { recursive: true });
      mkdirSync(outputDir, { recursive: true });

      const seedToken: Token = {
        name: 'test-color',
        value: 'oklch(0.5 0.2 250)',
        category: 'color',
        namespace: 'color',
        userOverride: null,
      };
      const registry = new TokenRegistry([seedToken]);
      saveRegistryToDir(tokensDir, registry);
    });

    afterEach(async () => {
      vi.unstubAllEnvs();
      vi.resetModules();
      await rm(tmpDir, { recursive: true, force: true });
    });

    async function loadPluginForTmpDir() {
      vi.resetModules();
      vi.stubEnv('RAFTERS_PROJECT_PATH', tmpDir);
      const mod = await import('../../src/api/vite-plugin');
      return mod.studioApiPlugin();
    }

    function createMockServer() {
      const wsSent: unknown[] = [];
      const wsHandlers = new Map<string, (...args: unknown[]) => void>();
      const middlewares: Array<(...args: unknown[]) => unknown> = [];
      return {
        server: {
          ws: {
            send(msg: unknown) {
              wsSent.push(msg);
            },
            on(event: string, handler: (...args: unknown[]) => void) {
              wsHandlers.set(event, handler);
            },
          },
          middlewares: {
            use(fn: (...args: unknown[]) => unknown) {
              middlewares.push(fn);
            },
          },
          watcher: {
            add(_paths: unknown) {},
            on(_event: string, _handler: (...args: unknown[]) => void) {},
          },
        },
        wsSent,
        wsHandlers,
        middlewares,
      };
    }

    it('POST /api/tokens/:name persists to disk and triggers HMR', async () => {
      const plugin = await loadPluginForTmpDir();
      const { server, wsSent, middlewares } = createMockServer();
      await (plugin.configureServer as (s: unknown) => Promise<void>)(server);

      const middleware = middlewares[0];
      expect(middleware).toBeDefined();

      const req = createMockRequest(
        { value: 'oklch(0.8 0.1 120)' },
        { method: 'POST', url: '/api/tokens/test-color' },
      );
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res._statusCode).toBeLessThan(400);

      const varsPath = join(tmpDir, '.rafters', 'output', 'rafters.css');
      expect(existsSync(varsPath)).toBe(true);
      const css = readFileSync(varsPath, 'utf-8');
      expect(css).toContain('oklch(0.8 0.1 120)');

      expect(wsSent).toContainEqual({ type: 'custom', event: 'rafters:css-updated' });
    });

    it('failed POST does not persist', async () => {
      const plugin = await loadPluginForTmpDir();
      const { server, wsSent, middlewares } = createMockServer();
      await (plugin.configureServer as (s: unknown) => Promise<void>)(server);

      const middleware = middlewares[0];

      const varsPath = join(tmpDir, '.rafters', 'output', 'rafters.css');
      writeFileSync(varsPath, 'original');

      const req = createMockRequest(
        { value: { invalid: true } },
        { method: 'POST', url: '/api/tokens/test-color' },
      );
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res._statusCode).toBeGreaterThanOrEqual(400);
      expect(readFileSync(varsPath, 'utf-8')).toBe('original');
      expect(wsSent).not.toContainEqual({ type: 'custom', event: 'rafters:css-updated' });
    });
  });
});
