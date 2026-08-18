/**
 * User representation component with image and fallback support
 *
 * @cognitive-load 2/10 - Simple display element with predictable behavior
 * @attention-economics Peripheral element: Supports content identification without demanding focus
 * @trust-building Consistent representation builds user recognition; fallbacks prevent broken states
 * @accessibility Alt text required for images; decorative avatars use aria-hidden
 * @semantic-meaning Size hierarchy: xs/sm=inline mentions, md=lists, lg/xl=profiles
 *
 * @usage-patterns
 * DO: Always provide alt text for meaningful avatars
 * DO: Use AvatarFallback for graceful degradation
 * DO: Match size to context (small in lists, large in profiles)
 * DO: Use delayMs on fallback to prevent loading flash
 * NEVER: Use without fallback - images fail
 * NEVER: Rely solely on avatar for identification - pair with name
 * NEVER: Use inconsistent sizes within the same context
 *
 * @example
 * ```tsx
 * // Basic avatar with fallback
 * <Avatar>
 *   <AvatarImage src="/user.jpg" alt="Jane Doe" />
 *   <AvatarFallback>JD</AvatarFallback>
 * </Avatar>
 *
 * // Large profile avatar
 * <Avatar size="xl">
 *   <AvatarImage src="/profile.jpg" alt="User profile" />
 *   <AvatarFallback delayMs={600}>
 *     <UserIcon className="h-8 w-8" />
 *   </AvatarFallback>
 * </Avatar>
 *
 * // Decorative avatar (aria-hidden)
 * <Avatar aria-hidden="true">
 *   <AvatarImage src="/bot.png" alt="" />
 *   <AvatarFallback>AI</AvatarFallback>
 * </Avatar>
 * ```
 */

/**
 * <rafters-avatar> -- the Web Component performance of the Avatar score.
 *
 * A caller-decides static, like the oracle: the old `avatar.element.ts`
 * explicitly deferred image-load coordination, and the old `avatar.astro` was
 * zero-JS (`src ? <img> : <fallback>`). This element carries no `bindAvatar`
 * (there is none): it renders the surface once from its attributes, and the
 * caller declares the load outcome via `status` (defaulted from `src`). The
 * presence rule is the SAME `resolveAvatar` the React and Astro performances
 * read -- one score, three performances, zero drift.
 *
 * Presentation resolves from the compiled utility sheet adopted by
 * RaftersElement (setUtilityCSS) plus the token custom properties inherited
 * from the host :root; the only component-owned CSS is the structural
 * host-display shim.
 *
 * Shadow structure: a `data-part="root"` span wrapping the image
 * (`data-part="image"`, present unless status is `error` and a `src` is set)
 * and/or the fallback (`data-part="fallback"`, present unless status is
 * `loaded`) whose default `<slot>` carries the initials from the light tree.
 *
 * Attributes:
 *   size    xs | sm | md | lg | xl        (default 'md'; unknown -> 'md')
 *   src     image source
 *   alt     image alt text                (default '')
 *   status  loading | loaded | error      (default: src present -> 'loaded',
 *                                           else 'error'; unknown -> 'loading')
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  type AvatarConfig,
  type AvatarStatus,
  isAvatarSize,
  isAvatarStatus,
  resolveAvatar,
} from './avatar.behavior';
import { avatarClasses } from './avatar.classes';

/**
 * The caller-decides default: an explicit `status` wins; otherwise a present
 * `src` means the caller expects a loaded image (image only), and its absence
 * means fall straight back (fallback only) -- the exact oracle Astro branch.
 */
function resolveStatus(rawStatus: string | null, src: string | null): AvatarStatus {
  if (isAvatarStatus(rawStatus)) return rawStatus;
  return src ? 'loaded' : 'error';
}

export class RaftersAvatar extends RaftersElement {
  static override styles = ':host { display: inline-flex; }';

  static readonly observedAttributes: ReadonlyArray<string> = ['size', 'src', 'alt', 'status'];

  override render(): Node {
    const src = this.getAttribute('src');
    const rawSize = this.getAttribute('size');
    const config: AvatarConfig = {
      size: isAvatarSize(rawSize) ? rawSize : undefined,
      status: resolveStatus(this.getAttribute('status'), src),
    };

    const resolved = resolveAvatar(config);
    const classes = avatarClasses(config);

    const root = document.createElement('span');
    root.setAttribute('data-part', 'root');
    root.className = classes.root;

    if (!resolved.imageHidden && src) {
      const image = document.createElement('img');
      image.setAttribute('data-part', 'image');
      image.className = classes.image;
      image.src = src;
      image.alt = this.getAttribute('alt') ?? '';
      root.appendChild(image);
    }

    if (!resolved.fallbackHidden) {
      const fallback = document.createElement('span');
      fallback.setAttribute('data-part', 'fallback');
      fallback.className = classes.fallback;
      fallback.appendChild(document.createElement('slot'));
      root.appendChild(fallback);
    }

    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-avatar')) {
  customElements.define('rafters-avatar', RaftersAvatar);
}
