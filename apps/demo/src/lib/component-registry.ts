/**
 * Component Registry
 * Loads and manages component metadata from the UI package
 */

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  extractDependencies,
  extractSizes,
  extractVariants,
  parseDescription,
  parseJSDocIntelligence,
} from './jsdoc-parser';
import { COMPONENT_CATEGORIES, type ComponentCategory, type ComponentMetadata } from './types';

// Path to UI components (relative from apps/demo)
const COMPONENTS_PATH = join(process.cwd(), '../../packages/ui/src/old/ui');

/**
 * Convert kebab-case to Title Case
 */
function toDisplayName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get category for a component
 */
function getCategory(name: string): ComponentCategory {
  return COMPONENT_CATEGORIES[name] || 'utility';
}

/**
 * Load a single component's metadata
 */
export function loadComponent(name: string): ComponentMetadata | null {
  const filePath = join(COMPONENTS_PATH, `${name}.tsx`);

  try {
    const source = readFileSync(filePath, 'utf-8');
    const intelligence = parseJSDocIntelligence(source);

    return {
      name,
      displayName: toDisplayName(name),
      description: parseDescription(source),
      category: getCategory(name),
      intelligence,
      variants: extractVariants(source),
      sizes: extractSizes(source),
      dependencies: extractDependencies(source),
      filePath: `packages/ui/src/old/ui/${name}.tsx`,
    };
  } catch {
    return null;
  }
}

/**
 * Load all components from the UI package
 */
export function loadAllComponents(): ComponentMetadata[] {
  try {
    const files = readdirSync(COMPONENTS_PATH).filter((f) => f.endsWith('.tsx'));

    const components: ComponentMetadata[] = [];

    for (const file of files) {
      const name = basename(file, '.tsx');
      const component = loadComponent(name);
      if (component) {
        components.push(component);
      }
    }

    // Sort by category order, then alphabetically
    return components.sort((a, b) => {
      const categoryOrder = getCategoryOrder(a.category) - getCategoryOrder(b.category);
      if (categoryOrder !== 0) return categoryOrder;
      return a.displayName.localeCompare(b.displayName);
    });
  } catch (error) {
    console.error('Failed to load components:', error);
    return [];
  }
}

/**
 * Get category sort order
 */
function getCategoryOrder(category: ComponentCategory): number {
  const order: Record<ComponentCategory, number> = {
    layout: 1,
    form: 2,
    feedback: 3,
    navigation: 4,
    overlay: 5,
    'data-display': 6,
    utility: 7,
  };
  return order[category] || 99;
}

/**
 * Get all component names
 */
export function getComponentNames(): string[] {
  try {
    const files = readdirSync(COMPONENTS_PATH).filter((f) => f.endsWith('.tsx'));
    return files.map((f) => basename(f, '.tsx')).sort();
  } catch {
    return [];
  }
}

/**
 * Group components by category
 */
export function groupByCategory(
  components: ComponentMetadata[],
): Map<ComponentCategory, ComponentMetadata[]> {
  const groups = new Map<ComponentCategory, ComponentMetadata[]>();

  for (const component of components) {
    const existing = groups.get(component.category) || [];
    existing.push(component);
    groups.set(component.category, existing);
  }

  return groups;
}
