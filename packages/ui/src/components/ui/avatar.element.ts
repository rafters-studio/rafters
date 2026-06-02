/**
 * <rafters-avatar> Web Component
 *
 * Framework-target for the Avatar component, parallel to avatar.tsx (React)
 * and avatar.astro (Astro). The inner span carries the SAME utility class
 * strings the React/Astro targets use -- imported from avatar.classes.ts --
 * rather than a parallel hand-written CSS map. Presentation resolves from the
 * shared compiled utility sheet adopted by RaftersElement (setUtilityCSS) plus
 * the token custom properties inherited from the host :root.
 *
 * This issue scopes to the OUTER <rafters-avatar> only. The inner image and
 * fallback subcomponents require image-load status coordination and are
 * deferred to a follow-up.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Shadow DOM structure: an inner span carrying the composed avatar utility
 * classes, wrapping a default slot.
 *
 * Attributes:
 *   size  xs | sm | md | lg | xl  (default 'md')
 *
 * Unknown attribute values fall back to 'md' silently and NEVER throw.
 *
 * @cognitive-load 2/10
 * @accessibility Semantic generic span; slotted content remains in the light tree.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import { avatarBaseClasses, avatarSizeClasses } from './avatar.classes';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const AVATAR_SIZES: ReadonlyArray<AvatarSize> = ['xs', 'sm', 'md', 'lg', 'xl'];

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = ['size'] as const;

function parseSize(value: string | null): AvatarSize {
  if (value && (AVATAR_SIZES as ReadonlyArray<string>).includes(value)) {
    return value as AvatarSize;
  }
  return 'md';
}

/**
 * Compose the inner span's class string from the shared class maps.
 * Exported so tests assert the WC renders the exact same composition the
 * Astro target does -- the parity guarantee.
 */
export function composeAvatarClasses(size: AvatarSize): string {
  return `${avatarBaseClasses} ${avatarSizeClasses[size]}`;
}

export class RaftersAvatar extends RaftersElement {
  static override styles = ':host { display: inline-flex; }';

  static readonly observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  override render(): Node {
    const inner = document.createElement('span');
    inner.className = composeAvatarClasses(parseSize(this.getAttribute('size')));
    inner.appendChild(document.createElement('slot'));
    return inner;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-avatar')) {
  customElements.define('rafters-avatar', RaftersAvatar);
}
