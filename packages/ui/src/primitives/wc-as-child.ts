/**
 * Web Component asChild primitive -- stub for future implementation.
 *
 * React's slot.ts clones an element and merges props at render time. Astro's
 * astro-as-child.ts parses rendered HTML and injects attributes. The WC
 * equivalent will merge attributes onto the light-DOM child element that the
 * custom element wraps, similar to Astro's approach but at the connectedCallback
 * lifecycle point.
 *
 * The contract lookup is already available via partSupportsAsChild from
 * lib/contract.ts -- the implementation here will use it to discover which
 * parts support render delegation.
 */

export { partSupportsAsChild } from '../lib/contract';
