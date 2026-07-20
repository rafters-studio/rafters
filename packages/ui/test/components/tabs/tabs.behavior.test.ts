/**
 * Pure behavior test for the tabs score. No DOM: exercises reducers, the
 * aria/keymap projections, and the per-instance tabsInstanceAria projection
 * directly. Roving-focus behavior (arrow/Home/End movement and the automatic
 * activation that rides its onNavigate) is asserted end to end in the three
 * conformance suites, which drive the real DOM the primitive operates on.
 */
import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  activeTab,
  isTabActive,
  orientationOf,
  tabs,
  tabsIds,
  tabsInstanceAria,
  type TabsConfig,
  type TabsState,
} from '../../../src/components/tabs/tabs.behavior';

const base: TabsConfig = {};
const ids = { root: 'r', list: 'r-list', trigger: 'r-trigger', panel: 'r-panel' };

describe('tabs initialState', () => {
  it('seeds from defaultValue', () => {
    expect(tabs.initialState({ defaultValue: 'details' })).toEqual({ value: 'details' });
  });

  it('seeds from a controlled value', () => {
    expect(tabs.initialState({ value: 'overview' })).toEqual({ value: 'overview' });
  });

  it("treats '' and absence as no active tab", () => {
    expect(tabs.initialState({ defaultValue: '' })).toEqual({ value: null });
    expect(tabs.initialState({})).toEqual({ value: null });
  });
});

describe('tabs activeTab (controlled shadows intrinsic)', () => {
  it('reads intrinsic state when uncontrolled', () => {
    expect(activeTab({ value: 'a' }, {})).toBe('a');
  });

  it('a controlled value shadows the intrinsic state', () => {
    expect(activeTab({ value: 'a' }, { value: 'b' })).toBe('b');
  });

  it("a controlled '' reads as no active tab", () => {
    expect(activeTab({ value: 'a' }, { value: '' })).toBeNull();
  });

  it('isTabActive reports the effective value, not the intrinsic one', () => {
    expect(isTabActive('b', { value: 'a' }, { value: 'b' })).toBe(true);
    expect(isTabActive('a', { value: 'a' }, { value: 'b' })).toBe(false);
  });
});

describe('tabs orientation', () => {
  it('defaults to horizontal', () => {
    expect(orientationOf({})).toBe('horizontal');
  });

  it('honors an explicit vertical axis', () => {
    expect(orientationOf({ orientation: 'vertical' })).toBe('vertical');
  });
});

describe('tabs activate action', () => {
  it('activate switches the active tab', () => {
    const { memory, dispatch } = createBehavior(tabs, base);
    expect(dispatch('activate', base, 'details')).toBe(true);
    expect(memory.get().value).toBe('details');
  });

  it('re-activating the active tab keeps the same state ref (no notify, no re-fire)', () => {
    const config: TabsConfig = { defaultValue: 'overview' };
    const { memory, dispatch } = createBehavior(tabs, config);
    const before = memory.get();
    dispatch('activate', config, 'overview');
    // Same reference -> memory does not notify. This is what makes automatic
    // activation safe: roving fires onNavigate on every move, including moves
    // that land back on the already-active tab.
    expect(memory.get()).toBe(before);
    expect(memory.get().value).toBe('overview');
  });

  it('tabs never deactivate: there is no action that clears the value', () => {
    expect(Object.keys(tabs.actions)).toEqual(['activate']);
  });
});

describe('tabs aria projection', () => {
  it('projects the default horizontal axis onto the root and the list', () => {
    const state = tabs.initialState(base);
    const projection = tabs.aria(state, base, ids);
    expect(projection.root).toEqual({ 'data-orientation': 'horizontal' });
    expect(projection.list).toEqual({ 'aria-orientation': 'horizontal' });
  });

  it('reflects a vertical axis', () => {
    const config: TabsConfig = { orientation: 'vertical' };
    const projection = tabs.aria(tabs.initialState(config), config, ids);
    expect(projection.root?.['data-orientation']).toBe('vertical');
    expect(projection.list?.['aria-orientation']).toBe('vertical');
  });

  it('declares tablist/tab/tabpanel roles and the two many parts', () => {
    expect(tabs.parts.list.role).toBe('tablist');
    expect(tabs.parts.trigger).toEqual({ role: 'tab', many: true });
    expect(tabs.parts.panel).toEqual({ role: 'tabpanel', many: true });
  });
});

describe('tabs instance projection (tabsInstanceAria)', () => {
  const config: TabsConfig = { defaultValue: 'overview' };
  const state = tabs.initialState(config);
  const instanceIds = { trigger: 't', panel: 'p' };

  it('the active trigger is selected and controls its panel', () => {
    expect(tabsInstanceAria('trigger', 'overview', state, config, instanceIds)).toEqual({
      'aria-selected': 'true',
      'aria-controls': 'p',
      'data-state': 'active',
    });
  });

  it('an inactive trigger still advertises the panel it controls', () => {
    expect(tabsInstanceAria('trigger', 'details', state, config, instanceIds)).toEqual({
      'aria-selected': 'false',
      'aria-controls': 'p',
      'data-state': 'inactive',
    });
  });

  it('the active panel is labelled by its tab and NOT hidden', () => {
    expect(tabsInstanceAria('panel', 'overview', state, config, instanceIds)).toEqual({
      'aria-labelledby': 't',
      'data-state': 'active',
      hidden: undefined,
    });
  });

  it('an inactive panel is hidden', () => {
    expect(tabsInstanceAria('panel', 'details', state, config, instanceIds).hidden).toBe(true);
  });

  it('carries no tabindex on the trigger (roving owns it as ephemeral DOM state)', () => {
    expect(tabsInstanceAria('trigger', 'overview', state, config, instanceIds)).not.toHaveProperty(
      'tabindex',
    );
  });

  it('a controlled value drives which instance is active', () => {
    const controlled: TabsConfig = { value: 'details' };
    expect(
      tabsInstanceAria('trigger', 'details', { value: 'overview' }, controlled, instanceIds)[
        'aria-selected'
      ],
    ).toBe('true');
  });

  it('projects nothing for the single parts', () => {
    expect(tabsInstanceAria('root', 'overview', state, config, instanceIds)).toEqual({});
    expect(tabsInstanceAria('list', 'overview', state, config, instanceIds)).toEqual({});
  });

  it('is wired onto the spec so the generic harness driver finds it', () => {
    expect(tabs.instanceAria).toBe(tabsInstanceAria);
  });
});

describe('tabs id naming (shared by all three performances)', () => {
  it('derives a trigger/panel pair that cross-reference each other', () => {
    expect(tabsIds('demo', 'overview')).toEqual({
      triggerId: 'demo-tab-overview',
      panelId: 'demo-panel-overview',
    });
  });
});

describe('tabs keymap', () => {
  const state: TabsState = { value: null };

  it('Enter and Space on a trigger map to activate', () => {
    expect(tabs.keymap({ key: 'Enter' }, state, 'trigger', base)).toBe('activate');
    expect(tabs.keymap({ key: ' ' }, state, 'trigger', base)).toBe('activate');
  });

  it('does not claim arrows or Home/End: roving-focus owns movement', () => {
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
      expect(tabs.keymap({ key }, state, 'trigger', base)).toBeNull();
    }
  });

  it('does not claim activation on the list, panel, or root', () => {
    expect(tabs.keymap({ key: 'Enter' }, state, 'list', base)).toBeNull();
    expect(tabs.keymap({ key: 'Enter' }, state, 'panel', base)).toBeNull();
    expect(tabs.keymap({ key: 'Enter' }, state, 'root', base)).toBeNull();
  });
});
