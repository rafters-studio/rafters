/**
 * Avatar -- a user's representation: an image with an initials (or icon)
 * fallback. The Web Component performs the static score once from its
 * attributes: it cannot observe live load events, so the caller declares the
 * image-load outcome with `status` (defaulted from `src`), and `resolveAvatar`
 * decides which of the image and the slotted fallback is present.
 *
 * @cognitive-load 2/10 - decision 0, information 1 (read the person), interaction
 * 0, disruption 0, learning 1. A peripheral display element with predictable
 * behavior; nothing to decide or operate.
 * @attention-economics Peripheral element: supports content identification
 * without demanding focus. An avatar identifies; it never announces. Pair it
 * with a name -- never rely on the image alone to convey who.
 * @trust-building Consistent representation builds recognition across a session;
 * the fallback prevents the broken-image state that erodes polish. Always
 * provide `alt` for a meaningful avatar; a decorative one takes `aria-hidden`.
 * @accessibility The image carries `alt` (native); the root and fallback spans
 * project no ARIA. Meaningful avatars require real alt text; decorative avatars
 * set `aria-hidden`. No keyboard interaction -- Avatar is not a widget.
 * @semantic-meaning Size hierarchy: xs/sm = inline mentions, md = lists,
 * lg/xl = profiles. Match the size to the context.
 *
 * @usage-patterns
 * DO: Always provide alt text for meaningful avatars
 * DO: Slot initials or an icon as the fallback for graceful degradation
 * DO: Match size to context (small in lists, large in profiles)
 * NEVER: Use without a fallback -- images fail
 * NEVER: Rely solely on the avatar for identification -- pair with a name
 * NEVER: Use inconsistent sizes within the same context
 *
 * @example
 * ```html
 * <rafters-avatar size="lg" src="/ada.png" alt="Ada Lovelace">AL</rafters-avatar>
 * ```
 */
import { RaftersElement } from '../../primitives/rafters-element';
import {
  isAvatarSize,
  isAvatarStatus,
  resolveAvatar,
  type AvatarConfig,
  type AvatarStatus,
} from './avatar.behavior';
import { avatarClasses } from './avatar.classes';

export class RaftersAvatar extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = ['size', 'src', 'alt', 'status'];

  override render(): Node {
    const size = this.getAttribute('size');
    const src = this.getAttribute('src');
    const alt = this.getAttribute('alt') ?? '';
    const rawStatus = this.getAttribute('status');
    // The caller declares the outcome; an absent or unknown status defaults
    // from `src` (present is loaded, absent is error).
    const status: AvatarStatus = isAvatarStatus(rawStatus) ? rawStatus : src ? 'loaded' : 'error';
    const config: AvatarConfig = { size: isAvatarSize(size) ? size : undefined, status };
    const resolved = resolveAvatar(config);
    const classes = avatarClasses(config);

    const root = document.createElement('span');
    root.setAttribute('data-part', 'root');
    root.className = classes.root;

    if (!resolved.imageHidden && src) {
      const image = document.createElement('img');
      image.setAttribute('data-part', 'image');
      image.setAttribute('src', src);
      image.setAttribute('alt', alt);
      image.className = classes.image;
      root.append(image);
    }
    if (!resolved.fallbackHidden) {
      const fallback = document.createElement('span');
      fallback.setAttribute('data-part', 'fallback');
      fallback.className = classes.fallback;
      fallback.append(document.createElement('slot'));
      root.append(fallback);
    }
    return root;
  }
}

if (!customElements.get('rafters-avatar')) {
  customElements.define('rafters-avatar', RaftersAvatar);
}
