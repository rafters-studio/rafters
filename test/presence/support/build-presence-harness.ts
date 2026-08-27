/**
 * buildPresenceHarness (#2157) -- the no-dev-server Playwright harness for
 * `usePresence`.
 *
 * This repo has no e2e dev server and a spec may not start one, so the REAL
 * hook (via `presence-harness-entry.ts`) is compiled into an injectable IIFE
 * with esbuild and handed to `page.setContent`.
 *
 * THE DURATIONS ARE DELIBERATELY LOPSIDED. The enter runs an order of magnitude
 * longer than the exit, and that asymmetry IS the interrupted-enter test: a hook
 * that waited on the cancelled enter instead of the exit would release around
 * ENTER_MS, and one that released on the enter's cancellation would release
 * immediately. Only a hook that observes the exit lands in the window between
 * them. Equal-ish durations would let all three pass.
 *
 * These are harness numbers, not system values -- nothing here is a token and
 * nothing here is read by shipped code.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

/** A long enter: still running when the spec presses close. */
export const ENTER_MS = 1200;
/** A short exit: what presence must actually wait for. */
export const EXIT_MS = 200;

const ENTRY = fileURLToPath(new URL('./presence-harness-entry.ts', import.meta.url));

let bundlePromise: Promise<string> | null = null;

/** Bundle the real hook once and reuse it across every test in a run. */
async function bundlePresence(): Promise<string> {
  if (bundlePromise === null) {
    bundlePromise = (async () => {
      const result = await build({
        entryPoints: [ENTRY],
        bundle: true,
        format: 'iife',
        globalName: 'RaftersPresence',
        platform: 'browser',
        // React reads process.env.NODE_ENV at module scope; without this the
        // bundle throws on `process is not defined` before anything mounts.
        define: { 'process.env.NODE_ENV': '"production"' },
        write: false,
      });
      const file = result.outputFiles[0];
      if (file === undefined) throw new Error('buildPresenceHarness: esbuild produced no output');
      return file.text;
    })();
  }
  return bundlePromise;
}

export async function buildPresenceHarness(): Promise<string> {
  const script = await bundlePresence();

  return `<!doctype html>
<meta charset="utf-8">
<style>
  @keyframes presence-enter {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes presence-exit {
    from { opacity: 1; transform: none; }
    to { opacity: 0; transform: translateY(-8px); }
  }
  #node[data-state="open"] {
    animation-name: presence-enter;
    animation-duration: ${ENTER_MS}ms;
    animation-timing-function: linear;
  }
  #node[data-state="closed"] {
    animation-name: presence-exit;
    animation-duration: ${EXIT_MS}ms;
    animation-timing-function: linear;
  }
  /* Mechanism B (#2017): the duration is zeroed, the animation stays attached. */
  @media (prefers-reduced-motion: reduce) {
    #node[data-state="open"],
    #node[data-state="closed"] { animation-duration: 0s; }
  }
</style>
<div id="host"></div>
<script>${script}</script>
<script>
  (function () {
    RaftersPresence.mount(document.getElementById('host'));
  })();
</script>`;
}
