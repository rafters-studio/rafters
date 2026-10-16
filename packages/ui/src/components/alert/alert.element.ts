/**
 * Status message component for important user feedback
 *
 * @cognitive-load 3/10 - Simple message display with clear visual hierarchy
 * @attention-economics Variant hierarchy: destructive=immediate attention, warning=caution, success=confirmation, info=supplementary
 * @trust-building Clear, honest feedback builds confidence; destructive alerts require careful wording
 * @accessibility role="alert" for urgent messages; role="status" for informational; never color-only
 * @semantic-meaning Variant mapping: default=neutral, info=helpful context, success=positive confirmation, warning=proceed with caution, destructive=error or danger
 *
 * @usage-patterns
 * DO: Use destructive for errors that need user action
 * DO: Use success to confirm completed actions
 * DO: Use warning for potential issues before they happen
 * DO: Include icons to reinforce meaning beyond color
 * NEVER: Use alerts for transient feedback (use contextual feedback instead)
 * NEVER: Stack multiple alerts - prioritize the most important
 * NEVER: Use destructive for warnings or warnings for info
 *
 * @example
 * ```tsx
 * // Error alert
 * <Alert variant="destructive">
 *   <AlertCircle className="h-4 w-4" />
 *   <AlertTitle>Error</AlertTitle>
 *   <AlertDescription>
 *     Your session has expired. Please log in again.
 *   </AlertDescription>
 * </Alert>
 *
 * // Success alert
 * <Alert variant="success">
 *   <CheckCircle className="h-4 w-4" />
 *   <AlertTitle>Success</AlertTitle>
 *   <AlertDescription>
 *     Your changes have been saved.
 *   </AlertDescription>
 * </Alert>
 *
 * // Informational alert
 * <Alert variant="info">
 *   <Info className="h-4 w-4" />
 *   <AlertTitle>Note</AlertTitle>
 *   <AlertDescription>
 *     This feature is in beta.
 *   </AlertDescription>
 * </Alert>
 * ```
 */
import { RaftersElement } from '../../primitives/rafters-element';
import { alert, isAlertVariant, type AlertConfig } from './alert.behavior';
import {
  alertActionClasses,
  alertClasses,
  alertDescriptionClasses,
  alertTitleClasses,
} from './alert.classes';

/** One fixed region: a div carrying the shared data-slot name and sub-part classes, wrapping a named slot. */
function region(dataSlot: string, className: string, slotName: string): HTMLElement {
  const div = document.createElement('div');
  div.setAttribute('data-slot', dataSlot);
  div.className = className;
  const slot = document.createElement('slot');
  slot.name = slotName;
  div.append(slot);
  return div;
}

export class RaftersAlert extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = ['variant'];

  override render(): Node {
    const variant = this.getAttribute('variant');
    const config: AlertConfig = { variant: isAlertVariant(variant) ? variant : 'default' };
    const classes = alertClasses(config, {});
    // The aria projection ignores ids, so pass an empty one.
    const { root: aria } = alert.aria({}, config, { root: '' });

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.className = classes.root;
    for (const [key, value] of Object.entries(aria ?? {})) {
      if (value !== undefined) root.setAttribute(key, String(value));
    }
    root.append(
      region('alert-title', alertTitleClasses, 'title'),
      region('alert-description', alertDescriptionClasses, 'description'),
      region('alert-action', alertActionClasses, 'action'),
      document.createElement('slot'),
    );
    return root;
  }
}

if (!customElements.get('rafters-alert')) {
  customElements.define('rafters-alert', RaftersAlert);
}
