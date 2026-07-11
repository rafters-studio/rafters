import type { BehaviorSpec } from '../../lib/contract';

/**
 * Card: a content surface, not a layout primitive (Container/Grid own
 * negative space -- the oracle's own docblock rules against nesting Card
 * for layout). A static score -- no state, no actions, no keymap, no
 * effects.
 *
 * The contract is structural, same shape as Container's: the semantic
 * element carries meaning (article = standalone content, section = grouped
 * content, aside = supplementary), the heading level inside `title` carries
 * document outline, and the surface itself (`bg-card`/`border-card-border`)
 * is decoration. None of that is an ARIA attribute the score has to
 * project -- it is native to the elements the config chooses, which is why
 * `aria` returns empty objects for every part, same as `container`.
 *
 * `header`/`title`/`description`/`content`/`footer` are declared `optional`
 * (rule 2026-07-03 fill-signature precedent extended here): a card that is
 * just a content surface with no header and no footer is still a valid
 * card, so every part beyond `root` may be absent from any given render.
 */

export type CardElement = 'div' | 'article' | 'section' | 'aside';

export type CardHeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface CardConfig {
  as?: CardElement | undefined;
  /** Heading level for the `title` part (document-outline placement is a
   *  consumer decision, not a fixed h3 -- oracle contract). */
  titleAs?: CardHeadingLevel | undefined;
  /** Fill signature over the color vocabulary (#1637). */
  fill?: string | undefined;
}

export type CardState = Record<never, never>;
export type CardActions = Record<never, never>;
export type CardPart = 'root' | 'header' | 'title' | 'description' | 'content' | 'footer';

export const card: BehaviorSpec<CardConfig, CardState, CardActions, CardPart> = {
  name: 'card',
  parts: {
    root: {},
    header: { optional: true },
    title: { optional: true },
    description: { optional: true },
    content: { optional: true },
    footer: { optional: true },
  },
  initialState: () => ({}),
  actions: {},
  canDispatch: () => true,
  // Structural surface: element choice and heading level carry the
  // semantics; the score projects nothing (matches container's empty aria).
  aria: () => ({ root: {}, header: {}, title: {}, description: {}, content: {}, footer: {} }),
  keymap: () => null,
  effects: () => [],
};
