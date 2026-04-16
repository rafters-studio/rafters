/**
 * CSS Parser for Design Token Import
 *
 * Extracts CSS custom properties from stylesheets with context awareness.
 * Handles :root, .dark, @theme, and @media prefers-color-scheme blocks.
 */

import * as csstree from 'css-tree';

export type VariableContext = 'root' | 'dark' | 'theme' | 'media' | 'other';

export interface CSSVariable {
  name: string;
  value: string;
  context: VariableContext;
  selector: string | undefined;
  mediaQuery: string | undefined;
  line: number;
  column: number;
}

export interface ParsedCSS {
  variables: CSSVariable[];
  hasThemeBlock: boolean;
  hasDarkMode: boolean;
  sourceType: 'tailwind-v4' | 'shadcn' | 'generic';
}

/**
 * Determine context from selector string
 */
function getContextFromSelector(selector: string): VariableContext {
  const s = selector.toLowerCase();
  if (s === ':root' || s === 'html' || s === ':where(:root)') {
    return 'root';
  }
  if (
    s.includes('.dark') ||
    s.includes('[data-theme="dark"]') ||
    s.includes('[data-mode="dark"]') ||
    s.includes(':root.dark')
  ) {
    return 'dark';
  }
  return 'other';
}

/**
 * Check if media query is for dark mode
 */
function isDarkModeMedia(mediaQuery: string): boolean {
  return mediaQuery.includes('prefers-color-scheme') && mediaQuery.includes('dark');
}

/**
 * Extract selector string from a Rule node
 */
function getSelectorString(rule: csstree.Rule): string {
  return csstree.generate(rule.prelude);
}

/**
 * Parse CSS content and extract all custom properties with context
 */
export function parseCSSFile(content: string): ParsedCSS {
  const variables: CSSVariable[] = [];
  let hasThemeBlock = false;
  let hasDarkMode = false;

  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(content, {
      positions: true,
      parseCustomProperty: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse CSS: ${message}`);
  }

  // Track current context during walk
  let currentMediaQuery: string | undefined;
  let currentSelector: string | undefined;

  csstree.walk(ast, {
    enter(node: csstree.CssNode) {
      // Track @theme blocks (Tailwind v4)
      if (node.type === 'Atrule' && node.name === 'theme') {
        hasThemeBlock = true;
      }

      // Track @media queries
      if (node.type === 'Atrule' && node.name === 'media' && node.prelude) {
        currentMediaQuery = csstree.generate(node.prelude);
        if (isDarkModeMedia(currentMediaQuery)) {
          hasDarkMode = true;
        }
      }

      // Track selectors in rules
      if (node.type === 'Rule') {
        currentSelector = getSelectorString(node);
        const context = getContextFromSelector(currentSelector);
        if (context === 'dark') {
          hasDarkMode = true;
        }
      }

      // Extract custom property declarations
      if (node.type === 'Declaration' && node.property.startsWith('--')) {
        let context: VariableContext;

        if (hasThemeBlock && !currentMediaQuery && !currentSelector) {
          // Inside @theme block without specific selector
          context = 'theme';
        } else if (currentMediaQuery && isDarkModeMedia(currentMediaQuery)) {
          context = 'media';
          hasDarkMode = true;
        } else if (currentSelector) {
          context = getContextFromSelector(currentSelector);
        } else {
          context = 'other';
        }

        const loc = node.loc;
        variables.push({
          name: node.property,
          value: node.value ? csstree.generate(node.value).trim() : '',
          context,
          selector: currentSelector,
          mediaQuery: currentMediaQuery,
          line: loc?.start.line ?? 0,
          column: loc?.start.column ?? 0,
        });
      }
    },
    leave(node: csstree.CssNode) {
      // Clear context when leaving nodes
      if (node.type === 'Atrule' && node.name === 'media') {
        currentMediaQuery = undefined;
      }
      if (node.type === 'Rule') {
        currentSelector = undefined;
      }
    },
  });

  // Determine source type based on patterns
  let sourceType: ParsedCSS['sourceType'] = 'generic';

  if (hasThemeBlock) {
    sourceType = 'tailwind-v4';
  } else {
    // Check for shadcn patterns
    const varNames = variables.map((v) => v.name);
    const shadcnPatterns = ['--background', '--foreground', '--primary', '--secondary', '--muted'];
    const matchCount = shadcnPatterns.filter((p) => varNames.includes(p)).length;
    if (matchCount >= 3) {
      sourceType = 'shadcn';
    }
  }

  return {
    variables,
    hasThemeBlock,
    hasDarkMode,
    sourceType,
  };
}

/**
 * Filter variables by context
 */
export function getVariablesByContext(parsed: ParsedCSS, context: VariableContext): CSSVariable[] {
  return parsed.variables.filter((v) => v.context === context);
}

/**
 * Get unique variable names (deduplicated across contexts)
 */
export function getUniqueVariableNames(parsed: ParsedCSS): string[] {
  return [...new Set(parsed.variables.map((v) => v.name))];
}

/**
 * Group variables by their base name (without -- prefix)
 */
export function groupVariablesByName(parsed: ParsedCSS): Map<string, CSSVariable[]> {
  const groups = new Map<string, CSSVariable[]>();

  for (const variable of parsed.variables) {
    const baseName = variable.name.replace(/^--/, '');
    const existing = groups.get(baseName) ?? [];
    existing.push(variable);
    groups.set(baseName, existing);
  }

  return groups;
}
