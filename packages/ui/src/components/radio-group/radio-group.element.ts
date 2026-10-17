/**
 * Radio group component for mutually exclusive selections
 *
 * @cognitive-load 3/10 - Clear single choice from visible options
 * @attention-economics Options visible simultaneously: enables comparison, reduces memory load
 * @trust-building Immediate visual feedback, reversible selection, clear current state
 * @accessibility Arrow key navigation between options, proper ARIA radiogroup, roving tabindex
 * @semantic-meaning Mutually exclusive choice: only one option can be selected at a time
 *
 * @usage-patterns
 * DO: Use for 2-5 mutually exclusive options
 * DO: Make all options visible for easy comparison
 * DO: Use descriptive labels for each option
 * DO: Pre-select the most common or safest option when appropriate
 * NEVER: More than 7 options (use Select instead), independent selections (use Checkbox)
 *
 * @example
 * ```tsx
 * <RadioGroup defaultValue="option-1">
 *   <div className="flex items-center gap-2">
 *     <RadioGroup.Item value="option-1" id="r1" />
 *     <Label htmlFor="r1">Option 1</Label>
 *   </div>
 *   <div className="flex items-center gap-2">
 *     <RadioGroup.Item value="option-2" id="r2" />
 *     <Label htmlFor="r2">Option 2</Label>
 *   </div>
 * </RadioGroup>
 * ```
 */

/**
 * WC performance for radio-group: a light-DOM element. It reads its config from
 * the host's attributes (value, orientation, disabled, required, name,
 * aria-label, aria-labelledby) and its items from `data-part="item"` markup
 * inside the host (`value`, `disabled`; the element defines no child tags),
 * renders the tree radio-group.tsx renders with the
 * initial projection applied, then hands the root to bindRadioGroup -- the same
 * DOM-native client the Astro performance calls. `value` is the seed only; the
 * element has no controlled value, no events and no form association.
 *
 * The bind is deferred one microtask because connectedCallback can fire before
 * the light-DOM children are parsed.
 */
import type { PartIds } from '../../lib/contract';
import {
  bindRadioGroup,
  radioGroup,
  radioItemAria,
  type RadioGroupConfig,
  type RadioGroupPart,
} from './radio-group.behavior';
import { radioGroupClasses } from './radio-group.classes';

let instanceCount = 0;

function setAttrs(el: HTMLElement, attrs: Record<string, string | boolean | undefined>): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    el.setAttribute(name, String(value));
  }
}

export class RaftersRadioGroup extends HTMLElement {
  private teardown: (() => void) | null = null;
  private readonly uid = `rafters-radio-group-${++instanceCount}`;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      const root = this.querySelector<HTMLElement>(':scope > [data-part="root"]') ?? this.render();
      this.teardown = bindRadioGroup(root);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }

  private render(): HTMLElement {
    const flag = (name: string): boolean => {
      const value = this.getAttribute(name);
      return value !== null && value !== 'false';
    };
    const config: RadioGroupConfig = {
      defaultValue: this.getAttribute('value') ?? '',
      orientation: this.getAttribute('orientation') === 'horizontal' ? 'horizontal' : 'vertical',
      disabled: flag('disabled'),
      required: flag('required'),
      name: this.getAttribute('name') ?? undefined,
    };
    const state = radioGroup.initialState(config);
    const classes = radioGroupClasses(config, state);

    const ids = {} as PartIds<RadioGroupPart>;
    for (const part of Object.keys(radioGroup.parts) as RadioGroupPart[]) {
      ids[part] = part === 'root' ? `${this.uid}-root` : '';
    }

    const root = document.createElement('div');
    root.setAttribute('data-part', 'root');
    root.setAttribute('role', 'radiogroup');
    root.id = ids.root;
    root.className = classes.root;
    setAttrs(root, {
      'data-name': config.name,
      'aria-label': this.getAttribute('aria-label') ?? undefined,
      'aria-labelledby': this.getAttribute('aria-labelledby') ?? undefined,
      ...radioGroup.aria(state, config, ids).root,
    });
    this.removeAttribute('aria-label');
    this.removeAttribute('aria-labelledby');

    const items = Array.from(this.querySelectorAll(':scope > [data-part="item"]'));
    for (const item of items) {
      const value = item.getAttribute('value') ?? '';
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('data-part', 'item');
      button.setAttribute('data-value', value);
      button.disabled = (config.disabled ?? false) || item.hasAttribute('disabled');
      button.className = classes.item;
      setAttrs(button, radioItemAria(value, state, config));
      const indicator = document.createElement('span');
      indicator.setAttribute('data-part', 'indicator');
      indicator.setAttribute('aria-hidden', 'true');
      indicator.className = classes.indicator;
      button.append(indicator, ...Array.from(item.childNodes));
      root.appendChild(button);
    }

    this.replaceChildren(root);
    return root;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-radio-group')) {
  customElements.define('rafters-radio-group', RaftersRadioGroup);
}
