import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PanelStateEntry } from './panel-state-context';
import { createPanelStateContextValue, usePanelStateRefs } from './panel-state-context';

type StoreRef = { current: Map<string, PanelStateEntry> };
type SubsRef = { current: Map<string, Set<() => void>> };

function makeRefs(): { storeRef: StoreRef; subscribersRef: SubsRef } {
  return {
    storeRef: { current: new Map<string, PanelStateEntry>() },
    subscribersRef: { current: new Map<string, Set<() => void>>() },
  };
}

describe('createPanelStateContextValue', () => {
  describe('registerDefaults', () => {
    it('uses the defaults when nothing is persisted', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      actions.registerDefaults('p', { count: 0 }, 1, {});
      expect(actions.getState('p')).toEqual({ count: 0 });
    });

    it('uses the persisted state when the version matches', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      actions.registerDefaults('p', { count: 0 }, 1, { p: { state: { count: 9 }, version: 1 } });
      expect(actions.getState('p')).toEqual({ count: 9 });
    });

    it('migrates when the persisted version differs and a migrate fn is given', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      const migrate = vi.fn(() => ({ count: 42 }));
      actions.registerDefaults(
        'p',
        { count: 0 },
        2,
        { p: { state: { old: true }, version: 1 } },
        migrate,
      );
      expect(migrate).toHaveBeenCalledWith({ old: true }, 1);
      expect(actions.getState('p')).toEqual({ count: 42 });
    });

    it('falls back to defaults when the version differs and no migrate fn is given', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      actions.registerDefaults('p', { count: 0 }, 2, { p: { state: { old: true }, version: 1 } });
      expect(actions.getState('p')).toEqual({ count: 0 });
    });

    it('is idempotent — a second call does not overwrite existing state', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      actions.registerDefaults('p', { count: 0 }, 1, {});
      actions.registerDefaults('p', { count: 99 }, 1, {});
      expect(actions.getState('p')).toEqual({ count: 0 });
    });

    it('falls back to initialPersistedStates passed at creation time', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {
        p: { state: { count: 7 }, version: 1 },
      });
      // persistedStates arg is empty → resolves from initialPersistedStates
      actions.registerDefaults('p', { count: 0 }, 1, {});
      expect(actions.getState('p')).toEqual({ count: 7 });
    });
  });

  describe('getState', () => {
    it('returns undefined for an unknown id', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      expect(actions.getState('missing')).toBeUndefined();
    });
  });

  describe('setState', () => {
    it('updates the state and notifies subscribers', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      actions.registerDefaults('p', { count: 0 }, 1, {});
      const sub = vi.fn();
      subscribersRef.current.set('p', new Set([sub]));
      actions.setState('p', (prev) => ({ count: (prev as { count: number }).count + 1 }));
      expect(actions.getState('p')).toEqual({ count: 1 });
      expect(sub).toHaveBeenCalledOnce();
    });

    it('is a no-op when the id has no entry', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      expect(() => actions.setState('missing', () => 1)).not.toThrow();
      expect(actions.getState('missing')).toBeUndefined();
    });

    it('does not throw when there are no subscribers for the id', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      actions.registerDefaults('p', { count: 0 }, 1, {});
      expect(() => actions.setState('p', () => ({ count: 5 }))).not.toThrow();
      expect(actions.getState('p')).toEqual({ count: 5 });
    });
  });

  describe('getAllState', () => {
    it('returns a snapshot of every registered id', () => {
      const { storeRef, subscribersRef } = makeRefs();
      const { actions } = createPanelStateContextValue(storeRef, subscribersRef, {});
      actions.registerDefaults('a', { x: 1 }, 1, {});
      actions.registerDefaults('b', { y: 2 }, 3, {});
      expect(actions.getAllState()).toEqual({
        a: { state: { x: 1 }, version: 1 },
        b: { state: { y: 2 }, version: 3 },
      });
    });
  });
});

describe('usePanelStateRefs', () => {
  it('returns stable Map refs across re-renders', () => {
    const { result, rerender } = renderHook(() => usePanelStateRefs());
    const first = result.current;
    expect(first.storeRef.current).toBeInstanceOf(Map);
    expect(first.subscribersRef.current).toBeInstanceOf(Map);
    rerender();
    expect(result.current.storeRef).toBe(first.storeRef);
    expect(result.current.subscribersRef).toBe(first.subscribersRef);
  });
});
