/**
 * Color Family composition primitive
 * Orchestrates a disclosure state machine with three states: resting, hover, selected.
 * Manages progressive reveal of color intelligence data sections.
 *
 * This is a composition primitive -- it uses nanostores atom for reactive state
 * and creates placeholder containers with data attributes that the React layer populates.
 *
 * @registry-name color-family
 * @registry-version 0.1.0
 * @registry-status published
 * @registry-path primitives/color-family.ts
 * @registry-type registry:primitive
 *
 * @cognitive-load 4/10 - Three-state machine with clear transitions
 * @attention-economics Progressive reveal: resting shows chip only, hover adds scale, selected adds all sections
 * @trust-building Animated transitions maintain object permanence; user controls disclosure depth
 * @accessibility aria-selected, aria-expanded on container; data attributes for state-driven styling
 * @semantic-meaning Composition = disclosure orchestration; leaf primitives handle individual section rendering
 *
 * @dependencies nanostores@^0.11.0
 *
 * @usage-patterns
 * DO: Use createColorFamily to manage disclosure state for a single color family
 * DO: Subscribe to $state for reactive UI updates
 * DO: Call destroy() on cleanup to remove all listeners and restore the container
 * NEVER: Manage section visibility independently -- the primitive owns disclosure state
 * NEVER: Set data-color-state manually -- use select()/deselect() or let events drive transitions
 *
 * @example
 * ```ts
 * const { $state, select, deselect, destroy } = createColorFamily(container, {
 *   onStateChange: (state) => console.log('now:', state),
 *   onSelect: () => console.log('selected'),
 *   onDeselect: () => console.log('deselected'),
 * });
 *
 * $state.subscribe((s) => updateUI(s));
 * destroy(); // cleanup
 * ```
 */

import { atom } from 'nanostores';
import type { CleanupFunction } from './types';

// ============================================================================
// Types
// ============================================================================

export type ColorFamilyDisclosureState = 'resting' | 'hover' | 'selected';

export interface ColorFamilyOptions {
  /** Called when the disclosure state changes */
  onStateChange?: (state: ColorFamilyDisclosureState) => void;
  /** Called when the family is selected */
  onSelect?: () => void;
  /** Called when the family is deselected */
  onDeselect?: () => void;
}

export interface ColorFamilyState {
  /** Reactive atom with current disclosure state */
  $state: {
    get(): ColorFamilyDisclosureState;
    subscribe(cb: (value: ColorFamilyDisclosureState) => void): () => void;
    listen(cb: (value: ColorFamilyDisclosureState) => void): () => void;
  };
  /** Programmatically select this family */
  select: () => void;
  /** Programmatically deselect this family */
  deselect: () => void;
  /** Clean up all listeners and restore the container */
  destroy: CleanupFunction;
}

// ============================================================================
// Constants
// ============================================================================

/** Sections that appear only in hover state (plus selected) */
const HOVER_SECTIONS = ['scale'] as const;

/** Sections that appear only in selected state */
const SELECTED_ONLY_SECTIONS = [
  'accessibility',
  'cvd',
  'weight',
  'semantic',
  'intelligence',
] as const;

/** All section names */
const ALL_SECTIONS = [...HOVER_SECTIONS, ...SELECTED_ONLY_SECTIONS] as const;

// ============================================================================
// Implementation
// ============================================================================

export function createColorFamily(
  container: HTMLElement,
  options: ColorFamilyOptions,
): ColorFamilyState {
  if (typeof window === 'undefined') {
    const noop = () => {};
    const $state = atom<ColorFamilyDisclosureState>('resting');
    return { $state, select: noop, deselect: noop, destroy: noop };
  }

  const { onStateChange, onSelect, onDeselect } = options;
  const $state = atom<ColorFamilyDisclosureState>('resting');
  const sectionElements = new Map<string, HTMLElement>();
  let destroyed = false;

  // Set initial state
  container.setAttribute('data-color-state', 'resting');

  // ---- Section management ----

  function addSection(name: string): void {
    if (sectionElements.has(name)) return;
    const el = document.createElement('div');
    el.setAttribute('data-color-section', name);
    sectionElements.set(name, el);
    container.appendChild(el);
  }

  function removeSection(name: string): void {
    const el = sectionElements.get(name);
    if (el) {
      el.remove();
      sectionElements.delete(name);
    }
  }

  function removeAllSections(): void {
    for (const name of ALL_SECTIONS) {
      removeSection(name);
    }
  }

  // ---- State transitions ----

  function transitionTo(newState: ColorFamilyDisclosureState): void {
    if (destroyed) return;
    const current = $state.get();
    if (current === newState) return;

    $state.set(newState);
    container.setAttribute('data-color-state', newState);

    // Manage sections based on state
    switch (newState) {
      case 'resting': {
        removeAllSections();
        container.removeAttribute('aria-selected');
        container.removeAttribute('aria-expanded');
        break;
      }
      case 'hover': {
        // Add scale section, remove selected-only sections
        for (const name of HOVER_SECTIONS) {
          addSection(name);
        }
        for (const name of SELECTED_ONLY_SECTIONS) {
          removeSection(name);
        }
        container.removeAttribute('aria-selected');
        container.removeAttribute('aria-expanded');
        break;
      }
      case 'selected': {
        // Add all sections
        for (const name of ALL_SECTIONS) {
          addSection(name);
        }
        container.setAttribute('aria-selected', 'true');
        container.setAttribute('aria-expanded', 'true');
        break;
      }
    }

    // Fire callbacks
    onStateChange?.(newState);
    if (newState === 'selected') {
      onSelect?.();
    }
    if (current === 'selected' && newState !== 'selected') {
      onDeselect?.();
    }
  }

  // ---- Event handlers ----

  function handlePointerEnter(): void {
    const current = $state.get();
    if (current === 'resting') {
      transitionTo('hover');
    }
  }

  function handlePointerLeave(): void {
    const current = $state.get();
    if (current === 'hover') {
      transitionTo('resting');
    }
    // If selected, stay selected
  }

  function handleClick(): void {
    const current = $state.get();
    if (current === 'resting' || current === 'hover') {
      transitionTo('selected');
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      const current = $state.get();
      if (current === 'resting' || current === 'hover') {
        event.preventDefault();
        transitionTo('selected');
      }
    } else if (event.key === 'Escape') {
      const current = $state.get();
      if (current === 'selected') {
        event.preventDefault();
        transitionTo('resting');
      }
    }
  }

  // ---- Attach listeners ----

  container.addEventListener('pointerenter', handlePointerEnter);
  container.addEventListener('pointerleave', handlePointerLeave);
  container.addEventListener('click', handleClick);
  container.addEventListener('keydown', handleKeydown);

  // ---- Public API ----

  function select(): void {
    transitionTo('selected');
  }

  function deselect(): void {
    transitionTo('resting');
  }

  function destroy(): void {
    destroyed = true;
    container.removeEventListener('pointerenter', handlePointerEnter);
    container.removeEventListener('pointerleave', handlePointerLeave);
    container.removeEventListener('click', handleClick);
    container.removeEventListener('keydown', handleKeydown);
    removeAllSections();
    container.removeAttribute('data-color-state');
    container.removeAttribute('aria-selected');
    container.removeAttribute('aria-expanded');
  }

  return { $state, select, deselect, destroy };
}
