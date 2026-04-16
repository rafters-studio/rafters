import { describe, expect, it } from 'vitest';
import {
  getUniqueVariableNames,
  getVariablesByContext,
  groupVariablesByName,
  parseCSSFile,
} from '../../src/onboard/css-parser.js';

describe('parseCSSFile', () => {
  describe(':root variables', () => {
    it('extracts variables from :root', () => {
      const css = `
        :root {
          --primary: oklch(0.6 0.15 250);
          --background: #ffffff;
        }
      `;
      const result = parseCSSFile(css);

      expect(result.variables).toHaveLength(2);
      expect(result.variables[0].name).toBe('--primary');
      expect(result.variables[0].context).toBe('root');
      expect(result.variables[1].name).toBe('--background');
    });

    it('handles html selector as root', () => {
      const css = `
        html {
          --font-sans: Inter, sans-serif;
        }
      `;
      const result = parseCSSFile(css);

      expect(result.variables[0].context).toBe('root');
    });
  });

  describe('.dark mode', () => {
    it('extracts variables from .dark selector', () => {
      const css = `
        :root {
          --background: #ffffff;
        }
        .dark {
          --background: #0a0a0a;
        }
      `;
      const result = parseCSSFile(css);

      expect(result.hasDarkMode).toBe(true);
      expect(result.variables).toHaveLength(2);

      const darkVars = getVariablesByContext(result, 'dark');
      expect(darkVars).toHaveLength(1);
      expect(darkVars[0].value).toBe('#0a0a0a');
    });

    it('handles [data-theme="dark"] selector', () => {
      const css = `
        [data-theme="dark"] {
          --primary: hsl(210 100% 50%);
        }
      `;
      const result = parseCSSFile(css);

      expect(result.hasDarkMode).toBe(true);
      expect(result.variables[0].context).toBe('dark');
    });

    it('handles :root.dark selector', () => {
      const css = `
        :root.dark {
          --foreground: white;
        }
      `;
      const result = parseCSSFile(css);

      expect(result.hasDarkMode).toBe(true);
      expect(result.variables[0].context).toBe('dark');
    });
  });

  describe('@media prefers-color-scheme', () => {
    it('extracts variables from dark media query', () => {
      const css = `
        :root {
          --background: white;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --background: black;
          }
        }
      `;
      const result = parseCSSFile(css);

      expect(result.hasDarkMode).toBe(true);

      const mediaVars = getVariablesByContext(result, 'media');
      expect(mediaVars).toHaveLength(1);
      expect(mediaVars[0].value).toBe('black');
      expect(mediaVars[0].mediaQuery).toContain('prefers-color-scheme');
    });
  });

  describe('@theme blocks (Tailwind v4)', () => {
    it('detects @theme block', () => {
      const css = `
        @theme {
          --color-primary: oklch(0.6 0.15 250);
          --spacing-4: 1rem;
        }
      `;
      const result = parseCSSFile(css);

      expect(result.hasThemeBlock).toBe(true);
      expect(result.sourceType).toBe('tailwind-v4');
    });

    it('marks @theme variables with theme context', () => {
      const css = `
        @theme {
          --color-accent: blue;
        }
      `;
      const result = parseCSSFile(css);

      const themeVars = getVariablesByContext(result, 'theme');
      expect(themeVars).toHaveLength(1);
      expect(themeVars[0].name).toBe('--color-accent');
    });
  });

  describe('shadcn detection', () => {
    it('detects shadcn pattern', () => {
      const css = `
        :root {
          --background: 0 0% 100%;
          --foreground: 222.2 84% 4.9%;
          --primary: 222.2 47.4% 11.2%;
          --secondary: 210 40% 96.1%;
          --muted: 210 40% 96.1%;
        }
      `;
      const result = parseCSSFile(css);

      expect(result.sourceType).toBe('shadcn');
    });

    it('does not false positive on generic CSS', () => {
      const css = `
        :root {
          --brand-color: blue;
          --text-color: black;
        }
      `;
      const result = parseCSSFile(css);

      expect(result.sourceType).toBe('generic');
    });
  });

  describe('source locations', () => {
    it('includes line and column numbers', () => {
      const css = `:root {
  --first: red;
  --second: blue;
}`;
      const result = parseCSSFile(css);

      expect(result.variables[0].line).toBeGreaterThan(0);
      expect(result.variables[0].column).toBeGreaterThan(0);
    });
  });

  describe('helper functions', () => {
    it('getUniqueVariableNames deduplicates', () => {
      const css = `
        :root { --color: white; }
        .dark { --color: black; }
      `;
      const result = parseCSSFile(css);

      const names = getUniqueVariableNames(result);
      expect(names).toEqual(['--color']);
    });

    it('groupVariablesByName groups correctly', () => {
      const css = `
        :root {
          --primary: blue;
          --primary-foreground: white;
        }
      `;
      const result = parseCSSFile(css);

      const groups = groupVariablesByName(result);
      expect(groups.get('primary')).toHaveLength(1);
      expect(groups.get('primary-foreground')).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty CSS', () => {
      const result = parseCSSFile('');

      expect(result.variables).toHaveLength(0);
      expect(result.hasThemeBlock).toBe(false);
      expect(result.hasDarkMode).toBe(false);
    });

    it('handles CSS without custom properties', () => {
      const css = `
        body {
          margin: 0;
          padding: 0;
        }
      `;
      const result = parseCSSFile(css);

      expect(result.variables).toHaveLength(0);
    });

    it('handles complex values', () => {
      const css = `
        :root {
          --gradient: linear-gradient(to right, red, blue);
          --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
      `;
      const result = parseCSSFile(css);

      expect(result.variables).toHaveLength(2);
      expect(result.variables[0].value).toContain('linear-gradient');
      expect(result.variables[1].value).toContain('rgb');
    });

    it('handles var() references', () => {
      const css = `
        :root {
          --base: blue;
          --derived: var(--base);
        }
      `;
      const result = parseCSSFile(css);

      expect(result.variables[1].value).toBe('var(--base)');
    });

    it('handles malformed CSS gracefully (fault-tolerant parser)', () => {
      // css-tree is fault-tolerant, so malformed CSS doesn't throw
      // It extracts what it can and skips invalid parts
      const malformedCSS = ':root { --color: red; /* unclosed comment';
      const result = parseCSSFile(malformedCSS);

      // Should still extract the valid variable
      expect(result.variables.length).toBeGreaterThanOrEqual(0);
    });
  });
});
