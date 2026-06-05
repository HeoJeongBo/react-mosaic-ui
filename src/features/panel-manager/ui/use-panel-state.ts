import { useMosaicWindowContext } from '@/shared/lib/context';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { usePanelStateContext } from './panel-state-context';

export interface UsePanelStateOptions<T> {
  defaultState: T | (() => T);
  /** Storage version for migration. Increment when the state shape changes. Default: 1 */
  version?: number;
  /** Called when stored version differs from current version. Return migrated state. */
  migrate?: (persisted: unknown, fromVersion: number) => T;
}

function resolveDefault<T>(defaultState: T | (() => T)): T {
  return typeof defaultState === 'function' ? (defaultState as () => T)() : defaultState;
}

export function usePanelState<T>(
  options: UsePanelStateOptions<T>,
): [T, (updater: T | ((prev: T) => T)) => void] {
  const { defaultState, version = 1, migrate } = options;

  const { panelId } = useMosaicWindowContext();
  const ctx = usePanelStateContext();
  const panelIdStr = panelId != null ? String(panelId) : null;

  // Fallback local state when used outside PanelStateContext or without a panelId.
  const localStateRef = useRef<T>(resolveDefault(defaultState));
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  // Register defaults synchronously during render (idempotent — no-op if already registered).
  // This mirrors React's useState initializer: safe to call during render because it only
  // writes if the key is absent, with no observable side effects on other components.
  if (panelIdStr && ctx) {
    ctx.actions.registerDefaults(
      panelIdStr,
      resolveDefault(defaultState),
      version,
      {},
      migrate as ((persisted: unknown, fromVersion: number) => unknown) | undefined,
    );
  }

  // Subscribe to store updates so this component re-renders when its slice changes.
  useEffect(() => {
    if (!panelIdStr || !ctx) return;
    const notify = () => forceRender();
    const subs = ctx.subscribersRef.current;
    if (!subs.has(panelIdStr)) subs.set(panelIdStr, new Set());
    subs.get(panelIdStr)!.add(notify);
    return () => {
      subs.get(panelIdStr)?.delete(notify);
    };
  }, [panelIdStr, ctx]);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      if (!panelIdStr || !ctx) {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: T) => T)(localStateRef.current)
            : updater;
        localStateRef.current = next;
        forceRender();
        return;
      }
      ctx.actions.setState(panelIdStr, (prev) =>
        typeof updater === 'function' ? (updater as (prev: T) => T)(prev as T) : updater,
      );
    },
    [panelIdStr, ctx],
  );

  if (!panelIdStr || !ctx) {
    return [localStateRef.current, setState];
  }

  const storedState = ctx.actions.getState(panelIdStr) as T | undefined;
  return [storedState ?? resolveDefault(defaultState), setState];
}
