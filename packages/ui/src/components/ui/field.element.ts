/**
 * <rafters-field> -- Web Component form field wrapper.
 *
 * Layout-composition primitive that pairs a label with a slotted control and
 * optional helper/error text. NOT form-associated; the slotted control owns
 * submission. The field wires accessibility attributes to the control:
 *   - label[for] <-> control[id]
 *   - aria-describedby merges description + error ids
 *   - aria-invalid when error is present
 *   - aria-required when required
 *   - disabled propagated to the control
 *
 * Each inner node carries the SAME utility class strings the React target
 * uses -- imported from field.classes.ts (and label.classes.ts for the label,
 * exactly as field.tsx composes via the Label component) -- rather than a
 * parallel hand-written CSS map. Presentation resolves from the shared compiled
 * utility sheet adopted by RaftersElement (setUtilityCSS) plus the token custom
 * properties inherited from the host :root.
 *
 * The only shadow-scoped CSS this component owns is the structural :host
 * display shim.
 *
 * Attributes (all observed):
 *  - label: string -- label text (empty when missing)
 *  - description: string -- helper text shown when no error
 *  - error: string -- error text; replaces description
 *  - required: boolean -- presence toggles the marker and aria-required
 *  - disabled: boolean -- presence dims label and propagates to control
 *  - id: string -- stable field id; generated from crypto.randomUUID when absent
 *
 * Respects author-provided id / aria-describedby on the slotted control.
 */

import { RaftersElement } from '../../primitives/rafters-element';
import {
  fieldContainerClasses,
  fieldDescriptionClasses,
  fieldErrorClasses,
  fieldLabelDisabledClasses,
  fieldRequiredMarkerClasses,
} from './field.classes';
import { labelBaseClasses, labelVariantClasses } from './label.classes';

const OBSERVED_ATTRIBUTES: ReadonlyArray<string> = [
  'label',
  'description',
  'error',
  'required',
  'disabled',
  'id',
] as const;

function generateFieldId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `field-${crypto.randomUUID()}`;
  }
  return `field-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Compose the label node's class string. Mirrors field.tsx, which renders the
 * shared Label component (labelBaseClasses + default variant) plus the disabled
 * dimming utility. Exported for parity assertions in the test.
 */
export function composeFieldLabelClasses(disabled: boolean): string {
  return [
    labelBaseClasses,
    labelVariantClasses.default ?? '',
    disabled ? fieldLabelDisabledClasses : '',
  ]
    .filter((part) => part.length > 0)
    .join(' ');
}

export class RaftersField extends RaftersElement {
  static observedAttributes: ReadonlyArray<string> = OBSERVED_ATTRIBUTES;

  /**
   * The only component-owned CSS: the structural host-display shim. The field
   * stacks its parts as a block.
   */
  static override styles = ':host { display: block; }';

  /** Stable field id generated once per element lifetime. */
  private _fieldId: string | null = null;

  /** Bound listener reference for add/remove parity. */
  private _onSlotChange: (() => void) | null = null;

  // ==========================================================================
  // Public accessors
  // ==========================================================================

  get fieldId(): string {
    if (this._fieldId !== null) return this._fieldId;
    const attrId = this.getAttribute('id');
    this._fieldId = attrId && attrId.length > 0 ? attrId : generateFieldId();
    return this._fieldId;
  }

  get label(): string {
    return this.getAttribute('label') ?? '';
  }

  set label(next: string) {
    this.setAttribute('label', next);
  }

  get description(): string {
    return this.getAttribute('description') ?? '';
  }

  set description(next: string) {
    this.setAttribute('description', next);
  }

  get error(): string {
    return this.getAttribute('error') ?? '';
  }

  set error(next: string) {
    this.setAttribute('error', next);
  }

  get required(): boolean {
    return this.hasAttribute('required');
  }

  set required(next: boolean) {
    this.toggleAttribute('required', next);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(next: boolean) {
    this.toggleAttribute('disabled', next);
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  override connectedCallback(): void {
    if (!this.shadowRoot) return;

    // Lock in the field id on first connection; subsequent `id` attribute
    // changes are silent no-ops per spec.
    void this.fieldId;

    super.connectedCallback();
    this.attachSlotListener();
    this.wireSlottedControl();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    // `id` is intentionally immutable after first connect.
    if (name === 'id') return;

    this.update();
    this.wireSlottedControl();
  }

  override disconnectedCallback(): void {
    this.detachSlotListener();
    super.disconnectedCallback();
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  override render(): Node {
    const container = document.createElement('div');
    container.className = fieldContainerClasses;

    const fieldId = this.fieldId;
    const labelText = this.label;
    const descriptionText = this.description;
    const errorText = this.error;
    const hasError = errorText.length > 0;
    const hasDescription = descriptionText.length > 0;
    const isRequired = this.required;

    const labelEl = document.createElement('label');
    labelEl.className = composeFieldLabelClasses(this.disabled);
    labelEl.setAttribute('for', fieldId);
    labelEl.textContent = labelText;

    if (isRequired) {
      const marker = document.createElement('span');
      marker.className = fieldRequiredMarkerClasses;
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = '*';
      labelEl.appendChild(marker);
    }

    container.appendChild(labelEl);

    const slot = document.createElement('slot');
    container.appendChild(slot);

    if (hasError) {
      const errorEl = document.createElement('p');
      errorEl.className = fieldErrorClasses;
      errorEl.id = `${fieldId}-error`;
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent = errorText;
      container.appendChild(errorEl);
    } else if (hasDescription) {
      const descEl = document.createElement('p');
      descEl.className = fieldDescriptionClasses;
      descEl.id = `${fieldId}-description`;
      descEl.textContent = descriptionText;
      container.appendChild(descEl);
    }

    return container;
  }

  // ==========================================================================
  // Slot wiring
  // ==========================================================================

  private attachSlotListener(): void {
    if (!this.shadowRoot) return;
    const slot = this.shadowRoot.querySelector('slot');
    if (!slot) return;

    const handler = (): void => {
      this.wireSlottedControl();
    };
    slot.addEventListener('slotchange', handler);
    this._onSlotChange = handler;
  }

  private detachSlotListener(): void {
    if (!this._onSlotChange) return;
    const slot = this.shadowRoot?.querySelector('slot');
    if (slot) {
      slot.removeEventListener('slotchange', this._onSlotChange);
    }
    this._onSlotChange = null;
  }

  /**
   * Find the first slotted element control and wire accessibility attributes.
   * Respects author-provided `id` and `aria-describedby`. Disabled propagation
   * is unconditional so removing the host `disabled` attribute also clears it
   * from the control.
   */
  private wireSlottedControl(): void {
    const shadow = this.shadowRoot;
    if (!shadow) return;

    const slot = shadow.querySelector('slot');
    if (!slot) return;

    const assigned = slot.assignedElements({ flatten: true });
    const firstControl = assigned.find((node): node is Element => node instanceof Element) ?? null;
    if (!firstControl) return;

    // Determine ownership: if the control arrived without these, the field
    // generated them and is free to manage them. If the author supplied them,
    // we never overwrite.
    const authoredId = firstControl.hasAttribute('id') && firstControl.getAttribute('id') !== '';
    const authoredDescribedBy = firstControl.hasAttribute('aria-describedby');
    const authoredAriaLabel = firstControl.hasAttribute('aria-label');
    const authoredAriaLabelledBy = firstControl.hasAttribute('aria-labelledby');

    const fieldId = this.fieldId;
    const labelText = this.label;
    const hasError = this.error.length > 0;
    const hasDescription = this.description.length > 0;
    const errorId = `${fieldId}-error`;
    const descriptionId = `${fieldId}-description`;

    if (!authoredId) {
      firstControl.setAttribute('id', fieldId);
    }

    // Labels rendered in shadow DOM cannot cross the tree-scope boundary to
    // associate with slotted light-DOM controls via `for`/`id`. Mirror the
    // label text onto the control as `aria-label` so screen readers still
    // get a programmatic accessible name. Author-supplied aria-label or
    // aria-labelledby wins.
    if (!authoredAriaLabel && !authoredAriaLabelledBy && labelText.length > 0) {
      firstControl.setAttribute('aria-label', labelText);
    }

    if (!authoredDescribedBy) {
      const parts: string[] = [];
      if (hasError) parts.push(errorId);
      else if (hasDescription) parts.push(descriptionId);
      if (parts.length > 0) {
        firstControl.setAttribute('aria-describedby', parts.join(' '));
      } else {
        firstControl.removeAttribute('aria-describedby');
      }
    }

    if (hasError) {
      firstControl.setAttribute('aria-invalid', 'true');
    } else {
      firstControl.removeAttribute('aria-invalid');
    }

    if (this.required) {
      firstControl.setAttribute('aria-required', 'true');
    } else {
      firstControl.removeAttribute('aria-required');
    }

    if (this.disabled) {
      firstControl.setAttribute('disabled', '');
      if ('disabled' in firstControl) {
        (firstControl as HTMLInputElement).disabled = true;
      }
    } else {
      firstControl.removeAttribute('disabled');
      if ('disabled' in firstControl) {
        (firstControl as HTMLInputElement).disabled = false;
      }
    }

    // Keep the label[for] pointing at whatever id the control ended up with,
    // which may be author-supplied when the control arrived with an explicit id.
    const labelEl = shadow.querySelector('label');
    const controlId = firstControl.getAttribute('id');
    if (labelEl && controlId) {
      labelEl.setAttribute('for', controlId);
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-field')) {
  customElements.define('rafters-field', RaftersField);
}
