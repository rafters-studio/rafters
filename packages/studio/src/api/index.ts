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

// ============================================================================
// Config channel types
// ============================================================================

/** Font file locations and web font imports. */
export interface FontsConfig {
  path?: string | null;
  imports?: string[];
}

/** Full config.rafters.json shape as returned by getConfig. */
export interface RaftersConfig {
  framework?: string;
  registryUrl?: string;
  componentTarget?: string;
  componentsPath?: string | string[];
  primitivesPath?: string | string[];
  compositesPath?: string | string[];
  rulesPath?: string | string[];
  cssPath?: string | null;
  source?: string;
  exports?: Record<string, boolean>;
  darkMode?: 'class' | 'media';
  intent?: string;
  fonts?: FontsConfig;
  installed?: Record<string, string[]>;
}

export interface SetIntentOptions {
  intent: string;
}

export interface SetFontsOptions {
  path?: string | null;
  imports?: string[];
}

export type ConfigResult = { ok: true; config: RaftersConfig } | { ok: false; error: string };

export type IntentResult = { ok: true; intent: string } | { ok: false; error: string };

export type FontsResult = { ok: true; fonts: FontsConfig } | { ok: false; error: string };

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
    // oxlint-disable-next-line prefer-const -- assigned below but captured by the cleanup closure first (forward reference)
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

export type TokensResult = { ok: true; tokens: unknown[] } | { ok: false; error: string };

export function getTokens(namespace?: string): Promise<TokensResult> {
  return new Promise((resolve) => {
    if (!isHmrAvailable()) {
      resolve({ ok: false, error: 'HMR not available' });
      return;
    }

    // biome-ignore lint/style/noNonNullAssertion: checked by isHmrAvailable
    const hot = import.meta.hot!;

    const handler = (result: TokensResult) => {
      clearTimeout(timeoutId);
      hot.off('rafters:tokens', handler);
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      hot.off('rafters:tokens', handler);
      resolve({ ok: false, error: `Token read timed out after ${TOKEN_UPDATE_TIMEOUT_MS}ms` });
    }, TOKEN_UPDATE_TIMEOUT_MS);

    hot.on('rafters:tokens', handler);
    hot.send('rafters:get-tokens', { namespace });
  });
}

/**
 * Read the current config.rafters.json from the Vite plugin.
 */
export function getConfig(): Promise<ConfigResult> {
  return new Promise((resolve) => {
    if (!isHmrAvailable()) {
      console.warn('[rafters] getConfig called but HMR is not available');
      resolve({ ok: false, error: 'HMR not available' });
      return;
    }

    // biome-ignore lint/style/noNonNullAssertion: checked by isHmrAvailable
    const hot = import.meta.hot!;
    // oxlint-disable-next-line prefer-const -- assigned below but captured by the cleanup closure first (forward reference)
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeoutId);
      hot.off('rafters:config', handler);
    };

    const handler = (result: ConfigResult) => {
      cleanup();
      resolve(result);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: `Config read timed out after ${TOKEN_UPDATE_TIMEOUT_MS}ms` });
    }, TOKEN_UPDATE_TIMEOUT_MS);

    hot.on('rafters:config', handler);
    hot.send('rafters:get-config', {});
  });
}

/**
 * Write an intent name to config.rafters.json.
 *
 * Only known intent names are accepted; unknown names are rejected with the
 * known list. The caller (Studio UI) sequences token writes after the config
 * write -- this channel does not regenerate tokens.
 */
export function setIntent(options: SetIntentOptions): Promise<IntentResult> {
  return new Promise((resolve) => {
    if (!isHmrAvailable()) {
      console.warn('[rafters] setIntent called but HMR is not available');
      resolve({ ok: false, error: 'HMR not available' });
      return;
    }

    // biome-ignore lint/style/noNonNullAssertion: checked by isHmrAvailable
    const hot = import.meta.hot!;
    // oxlint-disable-next-line prefer-const -- assigned below but captured by the cleanup closure first (forward reference)
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeoutId);
      hot.off('rafters:intent-updated', handler);
    };

    const handler = (result: IntentResult) => {
      // Match response to our request by intent, or accept any error
      if ((result.ok && result.intent === options.intent) || !result.ok) {
        cleanup();
        resolve(result);
      }
    };

    timeoutId = setTimeout(() => {
      cleanup();
      resolve({
        ok: false,
        error: `Intent update timed out after ${TOKEN_UPDATE_TIMEOUT_MS}ms`,
      });
    }, TOKEN_UPDATE_TIMEOUT_MS);

    hot.on('rafters:intent-updated', handler);
    hot.send('rafters:set-intent', options);
  });
}

/**
 * Update the fonts config in config.rafters.json.
 *
 * Does NOT regenerate tokens -- fonts path/imports are build config, not token
 * values. Font role assignments are handled separately via setToken.
 */
export function setFonts(options: SetFontsOptions): Promise<FontsResult> {
  return new Promise((resolve) => {
    if (!isHmrAvailable()) {
      console.warn('[rafters] setFonts called but HMR is not available');
      resolve({ ok: false, error: 'HMR not available' });
      return;
    }

    // biome-ignore lint/style/noNonNullAssertion: checked by isHmrAvailable
    const hot = import.meta.hot!;
    // oxlint-disable-next-line prefer-const -- assigned below but captured by the cleanup closure first (forward reference)
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeoutId);
      hot.off('rafters:fonts-updated', handler);
    };

    const handler = (result: FontsResult) => {
      cleanup();
      resolve(result);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      resolve({
        ok: false,
        error: `Fonts update timed out after ${TOKEN_UPDATE_TIMEOUT_MS}ms`,
      });
    }, TOKEN_UPDATE_TIMEOUT_MS);

    hot.on('rafters:fonts-updated', handler);
    hot.send('rafters:set-fonts', options);
  });
}
