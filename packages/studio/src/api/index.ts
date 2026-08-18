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

/**
 * The designer-owned slice of the config Studio may write. Absent keys are
 * left untouched; `fonts` merges over the existing object field-by-field.
 */
export interface ConfigPatch {
  intent?: string;
  darkMode?: 'class' | 'media';
  fonts?: FontsConfig;
}

export type ConfigResult = { ok: true; config: RaftersConfig } | { ok: false; error: string };

const ROUNDTRIP_TIMEOUT_MS = 10_000;

/** Monotonic per-page counter used to correlate a request with its reply. */
let requestSeq = 0;

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
 * One request/response round-trip over the HMR socket. Every get/set below is
 * this shape: send `sendEvent` with `payload`, resolve on the first `recvEvent`
 * the `match` predicate accepts (default: the first reply). Resolves to a
 * structured error when HMR is unavailable or the reply times out.
 *
 * Each call carries a correlation id (`__rid`) that the server echoes back.
 * `getConfig` and `setConfig` share the `rafters:config` reply event, so
 * without the id a reply meant for one in-flight call could resolve another
 * (a get racing a set, or two rapid sets). The handler ignores any reply whose
 * id is not ours; a reply with no id (older server) falls through to the
 * predicate for backward compatibility.
 */
function roundtrip<T extends { ok: boolean }>(
  sendEvent: string,
  recvEvent: string,
  payload: unknown,
  match: (result: T) => boolean = () => true,
): Promise<T | { ok: false; error: string }> {
  return new Promise((resolve) => {
    if (!isHmrAvailable()) {
      console.warn(`[rafters] ${sendEvent} called but HMR is not available`);
      resolve({ ok: false, error: 'HMR not available' });
      return;
    }

    // biome-ignore lint/style/noNonNullAssertion: checked by isHmrAvailable
    const hot = import.meta.hot!;
    const rid = `${sendEvent}#${(requestSeq += 1)}`;
    // oxlint-disable-next-line prefer-const -- assigned below but captured by the cleanup closure first (forward reference)
    let timeoutId: ReturnType<typeof setTimeout>;

    const cleanup = () => {
      clearTimeout(timeoutId);
      hot.off(recvEvent, handler);
    };

    const handler = (result: T & { __rid?: string }) => {
      // A reply tagged for a different request belongs to another in-flight
      // call on the same event -- ignore it. Untagged replies fall through.
      if (result.__rid !== undefined && result.__rid !== rid) return;
      // Accept any error, or a success the caller's predicate matches.
      if (!result.ok || match(result)) {
        cleanup();
        resolve(result);
      }
    };

    timeoutId = setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: `${sendEvent} timed out after ${ROUNDTRIP_TIMEOUT_MS}ms` });
    }, ROUNDTRIP_TIMEOUT_MS);

    hot.on(recvEvent, handler);
    hot.send(sendEvent, { ...(payload as Record<string, unknown>), __rid: rid });
  });
}

/**
 * Send a token update to the Vite plugin.
 *
 * @param options.persist - Set to false for instant feedback without disk write.
 *                          Default true persists to .rafters/tokens/*.json
 */
export function setToken(options: SetTokenOptions): Promise<UpdateResult> {
  return roundtrip<Extract<UpdateResult, { ok: true }>>(
    'rafters:set-token',
    'rafters:token-updated',
    options,
    (result) => result.name === options.name,
  );
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

/**
 * Read the current config.rafters.json from the Vite plugin.
 */
export function getConfig(): Promise<ConfigResult> {
  return roundtrip<Extract<ConfigResult, { ok: true }>>('rafters:get-config', 'rafters:config', {});
}

/**
 * Patch the designer-owned config fields (`intent`, `darkMode`, `fonts`) in
 * config.rafters.json. Absent keys are left untouched; `fonts` merges over the
 * existing object. Only known intent names and valid font paths are accepted;
 * invalid patches are rejected with an error.
 *
 * Does NOT regenerate tokens -- these are build config, not token values. The
 * caller (Studio UI) sequences any token writes after the config write.
 */
export function setConfig(patch: ConfigPatch): Promise<ConfigResult> {
  return roundtrip<Extract<ConfigResult, { ok: true }>>(
    'rafters:set-config',
    'rafters:config',
    patch,
  );
}
