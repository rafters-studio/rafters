/**
 * Export utilities for generating different output formats
 */

export interface ExportConfig {
  tailwind: boolean;
  typescript: boolean;
  dtcg: boolean;
  compiled: boolean;
  documentation: boolean;
}

export const DEFAULT_EXPORTS: ExportConfig = {
  tailwind: true,
  typescript: true,
  dtcg: false,
  compiled: false,
  documentation: false,
};

export interface ExportChoice {
  name: string;
  value: keyof ExportConfig;
  checked: boolean;
  disabled?: string;
}

export const EXPORT_CHOICES: ExportChoice[] = [
  {
    name: 'Tailwind CSS (web projects)',
    value: 'tailwind',
    checked: true,
  },
  {
    name: 'TypeScript (type-safe constants)',
    value: 'typescript',
    checked: true,
  },
  {
    name: 'DTCG JSON (Figma Tokens, Style Dictionary)',
    value: 'dtcg',
    checked: false,
  },
  {
    name: 'Standalone CSS (pre-built, no Tailwind required)',
    value: 'compiled',
    checked: false,
  },
  {
    name: 'Documentation CSS (complete utility surface for docs/previews)',
    value: 'documentation',
    checked: false,
  },
];

// Future exports - shown as disabled
export const FUTURE_EXPORTS: ExportChoice[] = [
  {
    name: 'iOS (Swift/SwiftUI)',
    value: 'tailwind' as keyof ExportConfig, // placeholder
    checked: false,
    disabled: 'coming soon',
  },
  {
    name: 'Android (Compose)',
    value: 'tailwind' as keyof ExportConfig, // placeholder
    checked: false,
    disabled: 'coming soon',
  },
];

/**
 * Convert checkbox selections to ExportConfig
 */
export function selectionsToConfig(selections: string[]): ExportConfig {
  return {
    tailwind: selections.includes('tailwind'),
    typescript: selections.includes('typescript'),
    dtcg: selections.includes('dtcg'),
    compiled: selections.includes('compiled'),
    documentation: selections.includes('documentation'),
  };
}

/**
 * Convert ExportConfig to checkbox selections
 */
export function configToSelections(config: ExportConfig): string[] {
  const selections: string[] = [];
  if (config.tailwind) selections.push('tailwind');
  if (config.typescript) selections.push('typescript');
  if (config.dtcg) selections.push('dtcg');
  if (config.compiled) selections.push('compiled');
  if (config.documentation) selections.push('documentation');
  return selections;
}
