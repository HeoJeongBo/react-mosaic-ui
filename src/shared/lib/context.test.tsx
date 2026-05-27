import { renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import { MosaicContext, MosaicWindowContext, useMosaicContext, useMosaicWindowContext } from './context';

describe('useMosaicContext', () => {
  it('returns default context value when called outside Provider', () => {
    const { result } = renderHook(() => useMosaicContext());
    expect(result.current.mosaicId).toBe('default');
    expect(typeof result.current.mosaicActions.expand).toBe('function');
    expect(typeof result.current.mosaicActions.remove).toBe('function');
  });

  it('returns injected value when called inside Provider', () => {
    const mockActions = {
      expand: () => {},
      remove: () => {},
      hide: () => {},
      replaceWith: () => {},
      updateTree: () => {},
      getRoot: () => null,
      add: () => {},
    };
    const mockValue = {
      mosaicActions: mockActions,
      mosaicId: 'test-mosaic',
      renderTile: () => null as unknown as JSX.Element,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MosaicContext.Provider value={mockValue}>{children}</MosaicContext.Provider>
    );

    const { result } = renderHook(() => useMosaicContext(), { wrapper });
    expect(result.current.mosaicId).toBe('test-mosaic');
    expect(result.current.mosaicActions).toBe(mockActions);
  });

  it('works the same way with a generic type parameter specified', () => {
    const { result } = renderHook(() => useMosaicContext<string>());
    expect(result.current.mosaicId).toBe('default');
  });
});

describe('useMosaicWindowContext', () => {
  it('returns default context value when called outside Provider', () => {
    const { result } = renderHook(() => useMosaicWindowContext());
    expect(typeof result.current.mosaicWindowActions.split).toBe('function');
    expect(typeof result.current.mosaicWindowActions.replaceWithNew).toBe('function');
    expect(typeof result.current.mosaicWindowActions.getPath).toBe('function');
  });

  it('returns injected value when called inside Provider', () => {
    const mockWindowActions = {
      split: async () => {},
      replaceWithNew: async () => {},
      getPath: () => ['first' as const],
    };
    const mockValue = { mosaicWindowActions: mockWindowActions };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MosaicWindowContext.Provider value={mockValue}>{children}</MosaicWindowContext.Provider>
    );

    const { result } = renderHook(() => useMosaicWindowContext(), { wrapper });
    expect(result.current.mosaicWindowActions).toBe(mockWindowActions);
    expect(result.current.mosaicWindowActions.getPath()).toEqual(['first']);
  });

  it('default getPath() returns an empty array', () => {
    const { result } = renderHook(() => useMosaicWindowContext());
    expect(result.current.mosaicWindowActions.getPath()).toEqual([]);
  });
});
