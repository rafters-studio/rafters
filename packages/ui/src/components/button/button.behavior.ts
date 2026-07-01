/**
 * button.behavior.ts -- the framework-agnostic button definition.
 *
 * One slice (pressable) through the degenerate compose fold: button is the
 * walking skeleton for the behavior contract, not a composition stress test
 * (that is the second test article's job -- see docs/spec/components/button.md).
 */
import { compose } from '../../behavior/compose';
import { createBehavior, type BehaviorInstance } from '../../behavior/contract';
import {
  pressable,
  type PressableActions,
  type PressableConfig,
  type PressablePart,
  type PressableState,
} from '../../behavior/slices/pressable';

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

export const buttonBehavior = compose('button', pressable<ButtonConfig>());

export type ButtonBehaviorInstance = BehaviorInstance<
  ButtonConfig,
  ButtonState,
  ButtonActions,
  ButtonPart
>;

export function createButtonBehavior(config: ButtonConfig): ButtonBehaviorInstance {
  return createBehavior(buttonBehavior, config);
}
