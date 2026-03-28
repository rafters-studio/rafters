/**
 * Client-side token API for Studio
 *
 * Uses Vite's HMR WebSocket for instant updates.
 *
 * Two-phase color selection:
 * 1. setToken({ name, value, persist: false }) - instant feedback, no disk write
 * 2. setToken({ name, value }) - complete data, persists to disk
 */

import type { Token } from '@rafters/shared';

interface SetTokenOptions {
  name: string;
  value: Token['value'];
  persist?: boolean; // default true - set false for instant feedback
}

type UpdateResult = { ok: true; name: string; persisted: boolean } | { ok: false; error: string };

const TOKEN_UPDATE_TIMEOUT_MS = 10_000;

/**
 * Check if HMR is fully available (not just partially defined)
 */
function isHmrAvailable(): boolean {
  return Boolean(
    import.meta.hot &&
      typeof import.meta.hot.on === 'function' &&
      typeof import.meta.hot.off === 'function' &&
      typeof import.meta.hot.send === 'function',
  );
}

/**
 * Send a token update to the Vite plugin.
 *
 * @param options.persist - Set to false for instant feedback without disk write.
 *                          Default true persists to .rafters/tokens/*.json
 */
export function setToken(options: SetTokenOptions): Promise<UpdateResult> {
  return new Promise((resolve) => {
    if (!isHmrAvailable()) {
      console.warn('[rafters] setToken called but HMR is not available');
      resolve({ ok: false, error: 'HMR not available' });
      return;
    }

    // biome-ignore lint/style/noNonNullAssertion: checked by isHmrAvailable
    const hot = import.meta.hot!;
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeoutId);
      hot.off('rafters:token-updated', handler);
    };

    const handler = (result: UpdateResult) => {
      // Match response to our request by name, or accept any error
      if ((result.ok && result.name === options.name) || !result.ok) {
        cleanup();
        resolve(result);
      }
    };

    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: `Token update timed out after ${TOKEN_UPDATE_TIMEOUT_MS}ms` });
    }, TOKEN_UPDATE_TIMEOUT_MS);

    hot.on('rafters:token-updated', handler);
    hot.send('rafters:set-token', options);
  });
}

/**
 * Listen for CSS updates (for UI feedback).
 */
/**
 * Listen for color intelligence enrichment (arrives async after local math).
 * The intelligence section fills in live as the API responds.
 */
export function onColorEnriched(
  callback: (data: { name: string; intelligence: unknown }) => void,
): () => void {
  if (!isHmrAvailable()) return () => {};
  // biome-ignore lint/style/noNonNullAssertion: checked by isHmrAvailable
  const hot = import.meta.hot!;
  hot.on('rafters:color-enriched', callback);
  return () => hot.off('rafters:color-enriched', callback);
}

export function onCssUpdated(callback: () => void): () => void {
  if (!isHmrAvailable()) {
    if (import.meta.env?.DEV) {
      console.warn('[rafters] onCssUpdated called but HMR is not available');
    }
    return () => {};
  }

  // biome-ignore lint/style/noNonNullAssertion: checked by isHmrAvailable
  const hot = import.meta.hot!;
  hot.on('rafters:css-updated', callback);
  return () => hot.off('rafters:css-updated', callback);
}
