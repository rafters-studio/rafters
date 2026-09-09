/**
 * Setup for the `astro` project, which runs under `environment: 'node'`.
 *
 * Node is not optional: from Astro 6 the Container API cannot render into a
 * Vitest client environment (happy-dom, jsdom) because `.astro` modules then
 * compile for the client and every `renderToString` throws
 * NoMatchingRenderer (v6 upgrade guide, PR #14895). The environment decision
 * is made at the Vite config level, so it is safe to hand the worker a DOM
 * afterwards.
 *
 * The pre-trim `*.astro.conformance.test.ts` files parse `renderToString`
 * output through a global `document` and drive it with user-event, so this
 * registers happy-dom's globals once per worker through Vitest's own
 * environment implementation -- the same globals the `unit` project gets,
 * without the react plugin, jest-dom, or the RTL cleanup hook, none of which
 * an Astro SSR test needs. Post-trim tests parse with `new Window()` directly
 * and this registration goes with the conformance files.
 */
import { builtinEnvironments } from 'vitest/runtime';

await builtinEnvironments['happy-dom'].setup(globalThis, {
  happyDOM: {
    settings: {
      // Never let happy-dom fetch an iframe page over the network during a
      // test (Embed with a YouTube URL would otherwise hit the live host).
      // The navigation form, not the deprecated disableIframePageLoading: that
      // one reports its refusal through console.error, which the "consumer
      // class is discarded silently" conformance tests spy on; this one falls
      // back to setting the frame URL and fires load, quietly.
      navigation: { disableChildFrameNavigation: true },
      // Container output carries each component's <script type="module">;
      // happy-dom must neither fetch it nor report the refusal through
      // console.error, for the same spy (#2331 meeting #2332; hotfix pending).
      disableJavaScriptFileLoading: true,
      handleDisabledFileLoadingAsSuccess: true,
    },
  },
});
