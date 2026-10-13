/**
 * Dropdown selection component with search and accessibility features
 *
 * @cognitive-load 5/10 - Option selection with search functionality requires cognitive processing
 * @attention-economics State management: closed=compact display, open=full options, searching=filtered results
 * @trust-building Search functionality, clear selection indication, undo patterns for accidental selections
 * @accessibility Keyboard navigation, screen reader announcements, focus management, option grouping
 * @semantic-meaning Option structure: value=data, label=display, group=categorization, disabled=unavailable choices
 *
 * @usage-patterns
 * DO: Use 3-12 choices for optimal cognitive load
 * DO: Provide clear, descriptive option text
 * DO: Pre-select most common/safe option when appropriate
 * DO: Enable search for 8+ options to reduce cognitive load
 * NEVER: Too many options without grouping, unclear option descriptions
 *
 * @example
 * ```tsx
 * // shadcn-compatible usage (drop-in replacement)
 * import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@rafters/ui';
 *
 * <Select>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Choose option..." />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="option1">Option 1</SelectItem>
 *     <SelectItem value="option2">Option 2</SelectItem>
 *   </SelectContent>
 * </Select>
 *
 * // Or with namespaced imports
 * <Select>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Choose option..." />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Item value="option1">Option 1</Select.Item>
 *     <Select.Item value="option2">Option 2</Select.Item>
 *   </Select.Content>
 * </Select>
 * ```
 */

/**
 * WC performance for select: the thinnest wrapper. The score AND the DOM-native
 * binding (bindSelect) live in select.behavior.ts, shared with the Astro
 * performance. This file only adapts that binding to the custom-element
 * lifecycle -- deferring the bind one microtask because connectedCallback can
 * fire before the light-DOM parts are parsed.
 */
import { bindSelect, select } from './select.behavior';
import { selectClasses } from './select.classes';

/**
 * Wrap each `slot="start-icon"` / `slot="end-icon"` child in the decorative
 * wrapper the behavior projects aria-hidden onto, before the bind runs. A slotted
 * child of the trigger sits beside the value; a slotted child of an item sits
 * beside the item text (its last child, after the indicator). The light DOM has
 * no slot assignment, so the slot attribute is only the author's marker.
 */
function wrapIcons(host: HTMLElement): void {
  const classes = selectClasses({}, select.initialState({}));
  const kinds = [
    { slot: 'start-icon', part: 'startIcon', icon: 'inline-start' },
    { slot: 'end-icon', part: 'endIcon', icon: 'inline-end' },
  ] as const;
  for (const kind of kinds) {
    for (const child of host.querySelectorAll<HTMLElement>(`[slot="${kind.slot}"]`)) {
      const owner = child.parentElement?.closest<HTMLElement>(
        '[data-part="trigger"], [data-part="item"]',
      );
      if (!owner || child.closest('[data-part="startIcon"], [data-part="endIcon"]')) continue;
      const onTrigger = owner.dataset['part'] === 'trigger';
      const wrapper = document.createElement('span');
      wrapper.dataset['part'] = kind.part;
      wrapper.dataset['icon'] = kind.icon;
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.className =
        kind.part === 'startIcon'
          ? onTrigger
            ? classes.triggerStartIcon
            : classes.startIcon
          : onTrigger
            ? classes.triggerEndIcon
            : classes.endIcon;
      child.removeAttribute('slot');
      child.replaceWith(wrapper);
      wrapper.appendChild(child);
      // Reading order: the start wrapper before the value or text, the end
      // wrapper after it. The slotted child may sit anywhere among the owner's
      // children, so place it explicitly.
      const anchor = onTrigger
        ? owner.querySelector<HTMLElement>('[data-part="value"]')
        : (Array.from(owner.children).filter(
            (el) => el !== wrapper && !el.hasAttribute('data-part'),
          )[1] ?? null);
      if (anchor && anchor.parentElement === owner) {
        if (kind.part === 'startIcon') owner.insertBefore(wrapper, anchor);
        else anchor.after(wrapper);
      }
    }
  }
}

export class RaftersSelect extends HTMLElement {
  private teardown: (() => void) | null = null;

  connectedCallback(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.teardown) return;
      wrapIcons(this);
      this.teardown = bindSelect(this);
    });
  }

  disconnectedCallback(): void {
    this.teardown?.();
    this.teardown = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('rafters-select')) {
  customElements.define('rafters-select', RaftersSelect);
}
