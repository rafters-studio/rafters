import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Color Routes', () => {
  describe('GET /color/search', () => {
    // These tests require AI and Vectorize bindings which only work with remote: true
    // Skip in local development, run in CI with remote bindings
    it.skip('returns search results for valid query', async () => {
      const res = await SELF.fetch('http://localhost/color/search?q=ocean%20blue');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('query', 'ocean blue');
      expect(json).toHaveProperty('total');
      expect(Array.isArray(json.results)).toBe(true);
    });

    it('requires q parameter', async () => {
      const res = await SELF.fetch('http://localhost/color/search');

      // OpenAPI validation returns 422 Unprocessable Entity
      expect(res.status).toBe(422);
    });

    // Requires AI/Vectorize bindings - skip locally
    it.skip('accepts optional filter parameters', async () => {
      const res = await SELF.fetch(
        'http://localhost/color/search?q=blue&hue=blue&lightness=mid&chroma=saturated&limit=5',
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.query).toBe('blue');
    });

    it('validates hue enum values', async () => {
      const res = await SELF.fetch('http://localhost/color/search?q=test&hue=invalid');

      // OpenAPI validation returns 422 Unprocessable Entity
      expect(res.status).toBe(422);
    });

    it('validates limit range', async () => {
      const res = await SELF.fetch('http://localhost/color/search?q=test&limit=200');

      // OpenAPI validation returns 422 Unprocessable Entity
      expect(res.status).toBe(422);
    });
  });

  describe('GET /color/{oklch}', () => {
    it('returns generating status for uncached color without adhoc', async () => {
      const res = await SELF.fetch('http://localhost/color/0.500-0.120-240');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('generating');
      expect(json.color).toBeDefined();
      expect(json.requestId).toContain('pending-ai-');
    });

    it('validates OKLCH format', async () => {
      const res = await SELF.fetch('http://localhost/color/invalid-format');

      // OpenAPI validation returns 422 Unprocessable Entity
      expect(res.status).toBe(422);
    });

    it('validates OKLCH with wrong decimal places', async () => {
      // Should be L.LLL-C.CCC-H format
      const res = await SELF.fetch('http://localhost/color/0.5-0.12-240');

      // OpenAPI validation returns 422 Unprocessable Entity
      expect(res.status).toBe(422);
    });

    describe('adhoc=true (math-only fast path)', () => {
      it('returns found status with full ColorValue', async () => {
        const res = await SELF.fetch('http://localhost/color/0.700-0.150-260?adhoc=true');

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.status).toBe('found');
        expect(json.color).toBeDefined();
        expect(json.requestId).toBeUndefined();
      });

      it('includes 11-position scale', async () => {
        const res = await SELF.fetch('http://localhost/color/0.700-0.150-260?adhoc=true');
        const json = await res.json();

        expect(json.color.scale).toHaveLength(11);
        expect(json.color.scale[0]).toHaveProperty('l');
        expect(json.color.scale[0]).toHaveProperty('c');
        expect(json.color.scale[0]).toHaveProperty('h');
        expect(json.color.scale[0]).toHaveProperty('alpha');
      });

      it('includes color harmonies', async () => {
        const res = await SELF.fetch('http://localhost/color/0.700-0.150-260?adhoc=true');
        const json = await res.json();

        expect(json.color.harmonies).toBeDefined();
        expect(json.color.harmonies.complementary).toBeDefined();
        expect(json.color.harmonies.triadic).toHaveLength(3);
        expect(json.color.harmonies.analogous).toHaveLength(6);
        expect(json.color.harmonies.tetradic).toHaveLength(4);
        expect(json.color.harmonies.splitComplementary).toHaveLength(3);
        expect(json.color.harmonies.monochromatic).toHaveLength(6);
      });

      it('includes accessibility metadata', async () => {
        const res = await SELF.fetch('http://localhost/color/0.700-0.150-260?adhoc=true');
        const json = await res.json();

        expect(json.color.accessibility).toBeDefined();
        expect(json.color.accessibility.wcagAA).toBeDefined();
        expect(json.color.accessibility.wcagAAA).toBeDefined();
        expect(json.color.accessibility.onWhite).toBeDefined();
        expect(json.color.accessibility.onBlack).toBeDefined();
        expect(json.color.accessibility.apca).toBeDefined();
        expect(typeof json.color.accessibility.apca.onWhite).toBe('number');
        expect(typeof json.color.accessibility.apca.onBlack).toBe('number');
      });

      it('includes analysis with temperature and lightness', async () => {
        const res = await SELF.fetch('http://localhost/color/0.700-0.150-260?adhoc=true');
        const json = await res.json();

        expect(json.color.analysis).toBeDefined();
        expect(['warm', 'cool', 'neutral']).toContain(json.color.analysis.temperature);
        expect(typeof json.color.analysis.isLight).toBe('boolean');
        expect(json.color.analysis.name).toBeDefined();
      });

      it('includes atmospheric and perceptual weight', async () => {
        const res = await SELF.fetch('http://localhost/color/0.700-0.150-260?adhoc=true');
        const json = await res.json();

        expect(json.color.atmosphericWeight).toBeDefined();
        expect(json.color.perceptualWeight).toBeDefined();
      });

      it('includes semantic suggestions', async () => {
        const res = await SELF.fetch('http://localhost/color/0.700-0.150-260?adhoc=true');
        const json = await res.json();

        expect(json.color.semanticSuggestions).toBeDefined();
        expect(json.color.semanticSuggestions.danger).toBeDefined();
        expect(json.color.semanticSuggestions.success).toBeDefined();
        expect(json.color.semanticSuggestions.warning).toBeDefined();
        expect(json.color.semanticSuggestions.info).toBeDefined();
      });

      it('generates deterministic three-word color names', async () => {
        // Test violet (hue 260) - pale (L=0.7), honest (C=0.15, medium density), violet (H=260, no expanded hub)
        const violetRes = await SELF.fetch('http://localhost/color/0.700-0.150-260?adhoc=true');
        const violetJson = await violetRes.json();
        expect(violetJson.color.name).toBe('pale-honest-violet');

        // Test red (hue 10) - uses expanded hub with semantic sub-selection
        const redRes = await SELF.fetch('http://localhost/color/0.500-0.200-10?adhoc=true');
        const redJson = await redRes.json();
        expect(redJson.color.name).toBe('balanced-bold-warning-red');

        // Test low chroma - balanced (L=0.5), whisper (C=0.02, achromatic), arctic (H=180, no expanded hub)
        const lowChromaRes = await SELF.fetch('http://localhost/color/0.500-0.020-180?adhoc=true');
        const lowChromaJson = await lowChromaRes.json();
        expect(lowChromaJson.color.name).toBe('balanced-whisper-arctic');
      });

      it('varies luminosity word by lightness', async () => {
        // Test light (lightness 0.85) - faint (L=0.85), honest (C=0.15), violet (H=260)
        const lightRes = await SELF.fetch('http://localhost/color/0.850-0.150-260?adhoc=true');
        const lightJson = await lightRes.json();
        expect(lightJson.color.name).toBe('faint-honest-violet');

        // Test dark (lightness 0.20) - deep (L=0.2), honest (C=0.15), violet (H=260)
        const darkRes = await SELF.fetch('http://localhost/color/0.200-0.150-260?adhoc=true');
        const darkJson = await darkRes.json();
        expect(darkJson.color.name).toBe('deep-honest-violet');
      });
    });
  });
});
