import { createBehavior, type AriaAttrs, type BehaviorSpec } from '@/lib/contract';
import { updateAriaAttribute } from '@/lib/primitives/aria-manager';

/**
 * Image: a token-aware `<img>` wrapper with figure/figcaption semantics. A
 * STATIC score -- no reducer state, no actions, no keymap, no effects -- but
 * unlike Container its ARIA projection is LIVE: the `img` part carries
 * `aria-busy` while loading and the `status` overlay carries a role
 * (`alert` on error, `status` while loading), so the harness audits the
 * projection here.
 *
 * `status` is CONFIG, not state (the progress precedent): the score is a total
 * function from config to the figure's attributes. The runtime load/error
 * lifecycle is the retained-mode (React) surface -- the same disposition
 * button.behavior.ts records for its loading transition. The React decorator
 * flips `status` on the img's `load`/`error` events and feeds it back into
 * config; the DOM-native bind reads `status` once from the server/author
 * markup (default 'loaded' -- a clean, crawlable image before any JS, matching
 * the oracle's `isLoading=false` start).
 *
 * Move-with-care (src/old/ui/image.*): the editable surface -- upload,
 * drag-drop, paste, the alignment toolbar, the contentEditable caption -- is
 * DROPPED (out of scope, React-only in the oracle, and the WC oracle already
 * shed it). The load/error handling and the required-alt semantics are
 * preserved; size/alignment/radius/fill are token contract.
 */

export type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export type ImageAlignment = 'left' | 'center' | 'right';

export type ImageRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

export type ImageStatus = 'loading' | 'loaded' | 'error';

export interface ImageConfig {
  /** Size preset -- token-based max-width. */
  size?: ImageSize | undefined;
  /** Horizontal alignment via auto margins. Default 'center'. */
  alignment?: ImageAlignment | undefined;
  /** Corner radius token applied to the clipping frame. Default 'lg'. */
  radius?: ImageRadius | undefined;
  /** Fill signature over the colour vocabulary, painted behind the image
   *  (the frame placeholder). Resolved by fill-resolver, never a raw colour. */
  fill?: string | undefined;
  /** Load lifecycle. Config, not state: the consumer (React at runtime) owns
   *  the flip; the DOM-native bind reads it once. Default 'loaded'. */
  status?: ImageStatus | undefined;
  /** Message announced when the image fails to load. */
  errorMessage?: string | undefined;
  /** Accessible label announced while the image is loading. */
  loadingLabel?: string | undefined;
}

export type ImageState = Record<never, never>;
export type ImageActions = Record<never, never>;
export type ImagePart = 'root' | 'frame' | 'img' | 'status' | 'caption';

export const DEFAULT_ERROR_MESSAGE = 'Failed to load image';
export const DEFAULT_LOADING_LABEL = 'Loading image';

const ALLOWED_SIZES: ReadonlyArray<ImageSize> = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'];
const ALLOWED_ALIGNMENTS: ReadonlyArray<ImageAlignment> = ['left', 'center', 'right'];
const ALLOWED_RADII: ReadonlyArray<ImageRadius> = [
  'none',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  'full',
];
const ALLOWED_STATUSES: ReadonlyArray<ImageStatus> = ['loading', 'loaded', 'error'];

export interface ResolvedImage {
  status: ImageStatus;
  isLoading: boolean;
  isError: boolean;
  /** True when an overlay part is present (status !== 'loaded'). */
  hasOverlay: boolean;
  /** The overlay's live-region role: assertive on error, polite while loading. */
  role: 'alert' | 'status' | undefined;
  /** The overlay's announced message. */
  message: string;
}

/**
 * The one computation. `aria`, image.classes.ts and bindImage all read from
 * this -- the single source the three performances apply.
 */
export function resolveImage(config: ImageConfig): ResolvedImage {
  const status: ImageStatus = config.status ?? 'loaded';
  const isLoading = status === 'loading';
  const isError = status === 'error';
  return {
    status,
    isLoading,
    isError,
    hasOverlay: status !== 'loaded',
    role: isError ? 'alert' : isLoading ? 'status' : undefined,
    message: isError
      ? (config.errorMessage ?? DEFAULT_ERROR_MESSAGE)
      : isLoading
        ? (config.loadingLabel ?? DEFAULT_LOADING_LABEL)
        : '',
  };
}

export const image: BehaviorSpec<ImageConfig, ImageState, ImageActions, ImagePart> = {
  name: 'image',
  parts: {
    root: {},
    frame: {},
    img: {},
    // Present only while loading or in error; its role is projected, not fixed.
    status: { optional: true },
    caption: { optional: true },
  },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // figure/figcaption are native semantics (like Container's landmarks), so the
  // root/frame/caption projections are empty. The load contract is the img's
  // aria-busy plus the overlay's live-region role.
  aria: (_state, config) => {
    const { isLoading, role } = resolveImage(config);
    return {
      root: {},
      frame: {},
      img: { 'aria-busy': isLoading ? 'true' : undefined },
      status: { role },
      caption: {},
    };
  },
  keymap: () => null,
};

function parseEnum<T extends string>(raw: string | null, allowed: ReadonlyArray<T>): T | undefined {
  return raw !== null && (allowed as ReadonlyArray<string>).includes(raw) ? (raw as T) : undefined;
}

/**
 * Reconstruct the score's config from a root element's attributes -- the
 * inverse of the SSR/WC markup. Shared by bindImage and the Web Component so
 * the two never drift on how an attribute maps to config. `src`/`alt` are
 * native passthrough on the inner img and are not part of the projection.
 */
export function readImageConfig(root: HTMLElement): ImageConfig {
  return {
    size: parseEnum(root.getAttribute('size'), ALLOWED_SIZES),
    alignment: parseEnum(root.getAttribute('alignment'), ALLOWED_ALIGNMENTS),
    radius: parseEnum(root.getAttribute('radius'), ALLOWED_RADII),
    fill: root.getAttribute('fill') ?? undefined,
    status: parseEnum(root.getAttribute('status'), ALLOWED_STATUSES),
    errorMessage: root.getAttribute('error-message') ?? undefined,
    loadingLabel: root.getAttribute('loading-label') ?? undefined,
  };
}

/**
 * The DOM-native binding of the image score -- the client the Web Component and
 * the Astro <script> both import. Image is a STATIC score with no effects, so
 * the binding is the thinnest of the family: it re-reads config from the root
 * attributes and applies the resolved ARIA projection to the img and the
 * status overlay. Only React reads the projection declaratively.
 *
 * Three-gotcha ledger:
 *   1. Controlled-callback before/after: N/A. Image has no actions and no
 *      internal state; `status` is config, so there is nothing to compare.
 *   2. aria-manager coerces the resolved string 'false' to truthy -- the
 *      projection is already final, so apply it with { validate: false }.
 *   3. WC bind deferred one microtask -- see image.element.ts.
 */
export function bindImage(root: HTMLElement): () => void {
  const config = readImageConfig(root);

  const getPart = (part: string): HTMLElement | null =>
    part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);

  const { memory } = createBehavior(image, config);

  // The projection is already resolved (final strings, undefined = absent), so
  // apply it raw: validate:false skips aria-manager's author-input coercion,
  // which would re-read a string like 'false' as truthy.
  const applyProjection = (el: HTMLElement, attrs: AriaAttrs) => {
    for (const [name, value] of Object.entries(attrs)) {
      updateAriaAttribute(el, name as never, value as never, { validate: false });
    }
  };

  const render = () => {
    const state = memory.get();
    const projection = image.aria(state, config, {
      root: '',
      frame: '',
      img: '',
      status: '',
      caption: '',
    });
    for (const part of Object.keys(projection) as ImagePart[]) {
      const attrs = projection[part];
      const el = getPart(part);
      if (el && attrs) applyProjection(el, attrs);
    }
  };
  const unsubscribe = memory.subscribe(render); // fires immediately: first paint

  return () => {
    unsubscribe();
  };
}
