// Every rule, by the name the intent uses.
import type { Rule } from '../src/registry.ts';
import { at } from './at.ts';
import { cell } from './cell.ts';
import { compose } from './compose.ts';
import { contrast } from './contrast.ts';
import { css } from './css.ts';
import { join } from './join.ts';
import { media } from './media.ts';
import { mirror } from './mirror.ts';
import { multiply } from './multiply.ts';
import { progression } from './progression.ts';
import { state } from './state.ts';
import { step } from './step.ts';
import { transition } from './transition.ts';

export const rules = new Map<string, Rule>(
  Object.entries({
    at,
    cell,
    compose,
    contrast,
    css,
    join,
    media,
    mirror,
    multiply,
    progression,
    state,
    step,
    transition,
  }),
);
