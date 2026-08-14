import React from 'react';
import classy from '@/lib/primitives/classy';

/*
 * Tailwind content scan safelist -- these class names are built dynamically
 * via `text-${name}` and `ts-${name}`, so they must appear as literals
 * somewhere in scanned source for the utilities to compile.
 *
 * text-display-large text-display-medium text-title-large text-title-medium
 * text-title-small text-body-large text-body-medium text-body-small
 * text-label-large text-label-medium text-label-small text-code-large
 * text-code-small text-shortcut
 * ts-display-large ts-display-medium ts-title-large ts-title-medium
 * ts-title-small ts-body-large ts-body-medium ts-body-small
 * ts-label-large ts-label-medium ts-label-small ts-code-large
 * ts-code-small ts-shortcut
 */

interface TypeProps extends React.HTMLAttributes<HTMLElement> {
  as?: string;
}

const DEFAULT_COMPOSITIONS: Record<string, string> = {
  h1: 'display-medium',
  h2: 'title-large',
  h3: 'title-medium',
  h4: 'title-small',
  h5: 'title-small',
  h6: 'title-small',
  p: 'body-medium',
  blockquote: 'body-medium',
  code: 'code-small',
  pre: 'code-large',
  small: 'label-small',
  mark: 'body-medium',
  ul: 'body-medium',
  ol: 'body-medium',
  li: 'body-medium',
};

function createTypeComponent(tag: keyof React.JSX.IntrinsicElements, displayName: string) {
  const Component = React.forwardRef<HTMLElement, TypeProps>(
    ({ as: composition, className, children, ...props }, ref) => {
      const name = composition ?? DEFAULT_COMPOSITIONS[tag] ?? tag;
      const classes = classy(`text-${name}`, `ts-${name}`, className);
      return React.createElement(
        tag as string,
        { ref, 'data-part': 'root', className: classes || undefined, ...props },
        children,
      );
    },
  );
  Component.displayName = displayName;
  return Component;
}

export const H1 = createTypeComponent('h1', 'H1');
export const H2 = createTypeComponent('h2', 'H2');
export const H3 = createTypeComponent('h3', 'H3');
export const H4 = createTypeComponent('h4', 'H4');
export const H5 = createTypeComponent('h5', 'H5');
export const H6 = createTypeComponent('h6', 'H6');
export const P = createTypeComponent('p', 'P');
export const Blockquote = createTypeComponent('blockquote', 'Blockquote');
export const Code = createTypeComponent('code', 'Code');
export const Pre = createTypeComponent('pre', 'Pre');
export const Small = createTypeComponent('small', 'Small');
export const Mark = createTypeComponent('mark', 'Mark');
export const UL = createTypeComponent('ul', 'UL');
export const OL = createTypeComponent('ol', 'OL');
export const LI = createTypeComponent('li', 'LI');
