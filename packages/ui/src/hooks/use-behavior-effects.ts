import * as React from 'react';
import {
  createEffectRunner,
  type EffectHost,
  type EffectRunner,
  type EffectSpec,
} from '../lib/effects';

/**
 * The React effects adapter (one per framework, system-wide): reconciles a
 * behavior's declarative effect list after every commit and stops
 * everything on unmount. The effect-list diff is the runner's job; this
 * hook only owns the React lifecycle.
 */
export function useBehaviorEffects(effects: EffectSpec[], host: EffectHost): void {
  const runnerRef = React.useRef<EffectRunner | null>(null);

  React.useEffect(() => {
    runnerRef.current ??= createEffectRunner();
    runnerRef.current.apply(effects, host);
  });

  React.useEffect(() => {
    return () => {
      runnerRef.current?.stop();
      runnerRef.current = null;
    };
  }, []);
}
