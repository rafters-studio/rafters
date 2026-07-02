import { compose } from '../../lib/compose';
import type { BehaviorSpec } from '../../lib/contract';
import {
  pressable,
  type PressableActions,
  type PressableConfig,
  type PressablePart,
  type PressableState,
} from '../../lib/pressable';

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'accent'
  | 'outline'
  | 'ghost'
  | 'link';

export type ButtonSize =
  | 'default'
  | 'xs'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg';

export interface ButtonConfig extends PressableConfig {
  variant: ButtonVariant;
  size: ButtonSize;
}

export type ButtonState = PressableState;
export type ButtonActions = PressableActions;
export type ButtonPart = PressablePart;

export const button: BehaviorSpec<ButtonConfig, ButtonState, ButtonActions, ButtonPart> = compose(
  'button',
  pressable<ButtonConfig>(),
);
