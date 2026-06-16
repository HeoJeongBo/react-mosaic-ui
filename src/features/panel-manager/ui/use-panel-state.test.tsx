import { MosaicWindowContext } from '@/shared/lib/context';
import type { MosaicWindowActions } from '@/shared/types';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PanelStateContext,
  createPanelStateContextValue,
  usePanelStateRefs,
} from './panel-state-context';
import { usePanelState } from './use-panel-state';

afterEach(() => cleanup());

const noopWindowActions: MosaicWindowActions = {
  split: async () => {},
  replaceWithNew: async () => {},
  getPath: () => [],
};

// Builds a real PanelStateContext value (optionally seeded) using the production refs.
function makeCtxValue(seed: Record<string, { state: unknown; version: number }> = {}) {
  const { result } = renderHook(() => usePanelStateRefs());
  const { storeRef, subscribersRef } = result.current;
  return createPanelStateContextValue(storeRef, subscribersRef, seed);
}

function Wrapper({
  children,
  panelId,
  ctxValue,
}: {
  children: ReactNode;
  panelId?: string;
  ctxValue?: ReturnType<typeof createPanelStateContextValue> | null;
}) {
  const windowValue = {
    mosaicWindowActions: noopWindowActions,
    ...(panelId !== undefined && { panelId }),
  };
  const inner = (
    <MosaicWindowContext.Provider value={windowValue}>{children}</MosaicWindowContext.Provider>
  );
  if (ctxValue === undefined) return inner; // no provider at all
  return <PanelStateContext.Provider value={ctxValue}>{inner}</PanelStateContext.Provider>;
}

describe('usePanelState — context mode', () => {
  it('registers defaults and returns the stored state', () => {
    const ctxValue = makeCtxValue();
    let value: { count: number } | undefined;
    const Probe = () => {
      const [state] = usePanelState({ defaultState: { count: 0 } });
      value = state;
      return null;
    };
    render(
      <Wrapper panelId="p" ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    expect(value).toEqual({ count: 0 });
  });

  it('setState with a direct value updates and re-renders', () => {
    const ctxValue = makeCtxValue();
    let api: [{ count: number }, (u: unknown) => void] | undefined;
    const Probe = () => {
      api = usePanelState({ defaultState: { count: 0 } }) as typeof api;
      return <div data-testid="v">{api![0].count}</div>;
    };
    render(
      <Wrapper panelId="p" ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    act(() => api![1]({ count: 5 }));
    expect(screen.getByTestId('v').textContent).toBe('5');
  });

  it('setState with a functional updater updates and re-renders', () => {
    const ctxValue = makeCtxValue();
    let api: [{ count: number }, (u: unknown) => void] | undefined;
    const Probe = () => {
      api = usePanelState({ defaultState: { count: 1 } }) as typeof api;
      return <div data-testid="v">{api![0].count}</div>;
    };
    render(
      <Wrapper panelId="p" ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    act(() => api![1]((prev: { count: number }) => ({ count: prev.count + 1 })));
    expect(screen.getByTestId('v').textContent).toBe('2');
  });

  it('keeps state across a parent re-render (registerDefaults is idempotent)', () => {
    const ctxValue = makeCtxValue();
    let api: [{ count: number }, (u: unknown) => void] | undefined;
    const Probe = () => {
      api = usePanelState({ defaultState: { count: 0 } }) as typeof api;
      return <div data-testid="v">{api![0].count}</div>;
    };
    const { rerender } = render(
      <Wrapper panelId="p" ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    act(() => api![1]({ count: 7 }));
    rerender(
      <Wrapper panelId="p" ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    expect(screen.getByTestId('v').textContent).toBe('7');
  });

  it('migrates seeded state when the version differs', () => {
    const ctxValue = makeCtxValue({ p: { state: { old: 1 }, version: 1 } });
    let value: unknown;
    const Probe = () => {
      const [state] = usePanelState({
        defaultState: { v: 0 },
        version: 2,
        migrate: (persisted) => ({ migrated: persisted }),
      });
      value = state;
      return null;
    };
    render(
      <Wrapper panelId="p" ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    expect(value).toEqual({ migrated: { old: 1 } });
  });

  it('accepts a lazy defaultState initializer', () => {
    const ctxValue = makeCtxValue();
    let value: unknown;
    const Probe = () => {
      const [state] = usePanelState({ defaultState: () => ({ lazy: true }) });
      value = state;
      return null;
    };
    render(
      <Wrapper panelId="p" ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    expect(value).toEqual({ lazy: true });
  });

  it('unsubscribes on unmount', () => {
    const ctxValue = makeCtxValue();
    const Probe = () => {
      usePanelState({ defaultState: { count: 0 } });
      return null;
    };
    const { unmount } = render(
      <Wrapper panelId="p" ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    expect(ctxValue.subscribersRef.current.get('p')?.size).toBe(1);
    unmount();
    expect(ctxValue.subscribersRef.current.get('p')?.size).toBe(0);
  });
});

describe('usePanelState — fallback (local) mode', () => {
  it('warns once and uses local state when no PanelStateProvider is present', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let api: [{ count: number }, (u: unknown) => void] | undefined;
    const Probe = () => {
      api = usePanelState({ defaultState: { count: 0 } }) as typeof api;
      return <div data-testid="v">{api![0].count}</div>;
    };
    render(
      <Wrapper panelId="p">
        <Probe />
      </Wrapper>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('PanelStateProvider not found');

    // Local setState still works, and the warning does not fire again.
    act(() => api![1]({ count: 3 }));
    expect(screen.getByTestId('v').textContent).toBe('3');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('warns when the provider is present but no panelId is available', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctxValue = makeCtxValue();
    const Probe = () => {
      usePanelState({ defaultState: { count: 0 } });
      return null;
    };
    render(
      <Wrapper ctxValue={ctxValue}>
        <Probe />
      </Wrapper>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('panelId not available');
    warn.mockRestore();
  });

  it('local setState supports a functional updater', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let api: [{ count: number }, (u: unknown) => void] | undefined;
    const Probe = () => {
      api = usePanelState({ defaultState: () => ({ count: 10 }) }) as typeof api;
      return <div data-testid="v">{api![0].count}</div>;
    };
    render(
      <Wrapper panelId="p">
        <Probe />
      </Wrapper>,
    );
    act(() => api![1]((prev: { count: number }) => ({ count: prev.count + 5 })));
    expect(screen.getByTestId('v').textContent).toBe('15');
  });
});
