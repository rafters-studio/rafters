/**
 * Portal primitive for rendering content outside DOM hierarchy
 * SSR-safe with hydration support
 */

export interface PortalOptions {
  container?: HTMLElement | null;
  enabled?: boolean;
}

/**
 * Get the container element for portal rendering
 * SSR-safe: returns null during SSR
 */
export function getPortalContainer(options?: PortalOptions): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  if (options?.enabled === false) {
    return null;
  }

  return options?.container || document.body;
}

/**
 * Check if portals are supported in current environment
 */
export function isPortalSupported(): boolean {
  return typeof document !== 'undefined';
}
