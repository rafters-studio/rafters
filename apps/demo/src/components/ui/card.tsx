/**
 * Card -- a content surface for grouping related information on an elevated,
 * bordered panel. Compose Card with CardHeader, CardTitle, CardDescription,
 * CardContent, CardFooter, and CardAction; the surface is the contract, the
 * slots are the composition. The default `bg-card` surface can be replaced
 * with a `fill` signature over the colour vocabulary (never a raw background).
 *
 * @cognitive-load 2/10 - decision 0, info 1, interaction 0, disruption 0, learning 1
 * @attention-economics Neutral surface: the content drives attention, never
 * the container. A card groups; it does not announce. Reserve high-chroma
 * fills for cards that genuinely lead a view, or the elevation hierarchy
 * flattens into noise.
 * @trust-building Consistent padding rhythm (header/content/footer share the
 * p-6 scale), predictable boundaries, no surprise interactivity -- a card is
 * a surface, not a button; wrap it in a link or place a Button inside when a
 * whole-card action is wanted.
 * @accessibility The surface projects no ARIA -- semantics come from the
 * element (`as`) and from real headings inside. Use CardTitle's `as` to place
 * the heading at the correct outline level for the page; never skip levels.
 * @semantic-meaning Structural element via `as`: article = standalone
 * syndicatable content, section = a grouped region, aside = supplementary
 * content, div = a presentational grouping with no landmark.
 *
 * A pure static score has nothing to subscribe to: the performance is pure
 * decoration application. No useBehavior, no memory, no bind -- config in,
 * classes out, slots through, semantic element chosen by `as`.
 *
 * @example
 * ```tsx
 * <Card as="article">
 *   <CardHeader>
 *     <CardTitle>Blog Post Title</CardTitle>
 *     <CardDescription>Published Jan 2026</CardDescription>
 *   </CardHeader>
 *   <CardContent>Post excerpt...</CardContent>
 *   <CardFooter>
 *     <Button>Read more</Button>
 *   </CardFooter>
 * </Card>
 * ```
 */
import * as React from 'react';
import classy from '@/lib/primitives/classy';
import type { CardConfig, CardElement } from '@/components/ui/card.behavior';
import {
  cardActionClasses,
  cardClasses,
  cardContentClasses,
  cardDescriptionClasses,
  cardFooterClasses,
  cardHeaderClasses,
  cardTitleClasses,
} from '@/components/ui/card.classes';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: CardElement;
  /**
   * Fill signature over the colour vocabulary (#1637): `word`, `word/alpha`,
   * or `word-to-word`. When it resolves, the fill surface replaces the
   * default `bg-card` surface; an invalid signature keeps the default.
   */
  fill?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ as: Element = 'div', fill, className, children, ...props }, ref) => {
    const config: CardConfig = { as: Element, fill };
    const classes = cardClasses(config, {});

    // No effects and no optional parts -- nothing ever calls getPart, so the
    // ref is a plain forward. The score projects nothing, so there is no aria
    // to spread; the element's own semantics are the whole contract.
    return React.createElement(
      Element,
      {
        ref,
        'data-part': 'root',
        className: classy(classes.root, className) || undefined,
        'data-fill': fill || undefined,
        ...props,
      },
      children,
    );
  },
);

Card.displayName = 'Card';

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={classy(cardHeaderClasses, className)}
      {...props}
    />
  ),
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * Renders a raw heading (default h3) via createElement because Typography's
 * H1-H6 do not exist yet in the new tree (matrix: typography, pending) -- the
 * same raw-heading disposition Alert records. Repointing at a typography role
 * component is a follow-up, not an agent call to make now. `as` places the
 * heading at the correct outline level for the surrounding page.
 */
export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as: Element = 'h3', className, children, ...props }, ref) =>
    React.createElement(
      Element,
      { ref, 'data-slot': 'card-title', className: classy(cardTitleClasses, className), ...props },
      children,
    ),
);

CardTitle.displayName = 'CardTitle';

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

/** Raw paragraph via createElement, same Typography-pending disposition as the
 *  title -- plain composition over a literal class string. */
export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) =>
    React.createElement(
      'p',
      {
        ref,
        'data-slot': 'card-description',
        className: classy(cardDescriptionClasses, className),
        ...props,
      },
      children,
    ),
);

CardDescription.displayName = 'CardDescription';

export type CardActionProps = React.HTMLAttributes<HTMLDivElement>;

/** Trailing control slot (dismiss/menu), positioned into the header grid --
 *  shadcn v4 surface. Plain composition, no data-part. */
export const CardAction = React.forwardRef<HTMLDivElement, CardActionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-action"
      className={classy(cardActionClasses, className)}
      {...props}
    />
  ),
);

CardAction.displayName = 'CardAction';

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={classy(cardContentClasses, className)}
      {...props}
    />
  ),
);

CardContent.displayName = 'CardContent';

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={classy(cardFooterClasses, className)}
      {...props}
    />
  ),
);

CardFooter.displayName = 'CardFooter';

export default Card;
