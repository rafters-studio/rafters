/**
 * Shared primitive types
 */
export type CleanupFunction = () => void;

export type OutsideClickHandler = (event: MouseEvent | TouchEvent | PointerEvent) => void;

export type EscapeKeyHandler = (event: KeyboardEvent) => void;

export type Orientation = 'horizontal' | 'vertical' | 'both';

export type Direction = 'ltr' | 'rtl';

export type KeyboardKey =
  | 'Enter'
  | 'Space'
  | 'Escape'
  | 'Tab'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'
  | 'Backspace'
  | 'Delete';

export interface KeyboardModifiers {
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export type KeyboardHandlerCallback = (event: KeyboardEvent) => void;

export type LiveRegionPoliteness = 'polite' | 'assertive' | 'off';

export type LiveRegionRole = 'status' | 'alert' | 'log';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export type Align = 'start' | 'center' | 'end';

export interface Position {
  x: number;
  y: number;
  side: Side;
  align: Align;
}

export type FocusOutsideHandler = (event: FocusEvent) => void;

export type PointerDownOutsideHandler = (event: PointerEvent | TouchEvent) => void;

export type NavigationCallback = (element: HTMLElement, index: number) => void;

export type InlineMark = 'bold' | 'italic' | 'code' | 'strikethrough' | 'link';

export interface InlineContent {
  text: string;
  marks?: InlineMark[];
  href?: string;
}

export type InputType =
  | 'insertText'
  | 'insertParagraph'
  | 'insertLineBreak'
  | 'deleteContentBackward'
  | 'deleteContentForward'
  | 'deleteByCut'
  | 'insertFromPaste'
  | 'formatBold'
  | 'formatItalic'
  | 'formatUnderline'
  | 'formatStrikeThrough'
  | 'historyUndo'
  | 'historyRedo';

export interface SelectionRange {
  startNode: Node;
  startOffset: number;
  endNode: Node;
  endOffset: number;
  collapsed: boolean;
}

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category?: string;
  keywords?: string[];
  shortcut?: string;
  action: () => void;
}

export interface FormatDefinition {
  name: InlineMark;
  tag: string;
  shortcut?: string;
  attributes?: Record<string, string>;
  class?: string;
}
