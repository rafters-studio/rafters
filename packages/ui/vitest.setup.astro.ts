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
      // The SSR markup carries each component's <script>, and Embed's markup
      // carries a real iframe pointed at youtube-nocookie.com; the tests call
      // bindX(root) themselves and never expect a network fetch, so both the
      // module and the iframe page must never be fetched. A refused script
      // load only stays quiet with handleDisabledFileLoadingAsSuccess, and a
      // refused iframe load must go through navigation.disableChildFrameNavigation
      // rather than the deprecated disableIframePageLoading, which logs a
      // NotSupportedError through console.error unconditionally
      // (HTMLIFrameElement.js) with no handleDisabledFileLoadingAsSuccess
      // escape hatch -- the class-discard spies in embed, image, and progress
      // all counted that call (three tests went red on main after #2331 and
      // #2332 met).
      disableJavaScriptFileLoading: true,
      handleDisabledFileLoadingAsSuccess: true,
      navigation: {
        disableChildFrameNavigation: true,
      },
    },
  },
});
