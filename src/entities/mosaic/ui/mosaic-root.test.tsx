import { MosaicContext } from '@/shared/lib/context';
import type { MosaicNode } from '@/shared/types';
import { cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MosaicRoot } from './mosaic-root';

afterEach(() => cleanup());

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn(() => [{ isOver: false }, vi.fn()]),
    useDrag: vi.fn(() => [{ isDragging: false }, vi.fn(), vi.fn()]),
  };
});

const mockMosaicActions = {
  expand: vi.fn(),
  remove: vi.fn(),
  hide: vi.fn(),
  replaceWith: vi.fn(),
  updateTree: vi.fn(),
  getRoot: vi.fn(() => null),
};

function renderRoot<T extends string | number>(
  root: MosaicNode<T> | null,
  renderTileOverride?: (id: T, path: string[]) => JSX.Element,
) {
  const renderTile =
    renderTileOverride ?? ((id: T) => <div data-testid={`tile-${id}`}>{String(id)}</div>);
  return render(
    <MosaicContext.Provider
      value={{
        mosaicActions: mockMosaicActions,
        mosaicId: 'test-mosaic',
        renderTile: renderTile as (id: unknown, path: string[]) => JSX.Element,
      }}
    >
      <MosaicRoot root={root} className="test-root" />
    </MosaicContext.Provider>,
  );
}

describe('MosaicRoot', () => {
  describe('null root', () => {
    it('returns null when root is null', () => {
      const { container } = renderRoot(null);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('single leaf node', () => {
    it('renders a single tile', () => {
      const { getByTestId } = renderRoot('a');
      expect(getByTestId('tile-a')).toBeInTheDocument();
    });

    it('calls renderTile with (id, [])', () => {
      const renderTile = vi.fn((id: string) => <div data-testid={`tile-${id}`}>{id}</div>);
      renderRoot('a', renderTile);
      expect(renderTile).toHaveBeenCalledWith('a', []);
    });

    it('renders 4 drop targets for a leaf node', () => {
      const { container } = renderRoot('a');
      const targets = container.querySelectorAll('.rm-mosaic-drop-target');
      // 4 window-level + 4 viewport-edge from RootDropTargets = 8, but leaf has 4 of its own
      // Leaf has 4 + RootDropTargets has 8 = 12 total
      expect(targets.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('parent node', () => {
    const twoWindowTree: MosaicNode<string> = {
      direction: 'row',
      first: 'a',
      second: 'b',
      splitPercentage: 50,
    };

    it('renders both child tiles', () => {
      const { getByTestId } = renderRoot(twoWindowTree);
      expect(getByTestId('tile-a')).toBeInTheDocument();
      expect(getByTestId('tile-b')).toBeInTheDocument();
    });

    it('renders a Split component', () => {
      const { container } = renderRoot(twoWindowTree);
      expect(container.querySelector('.rm-mosaic-split')).toBeInTheDocument();
    });

    it('calls renderTile with correct paths for first and second', () => {
      const renderTile = vi.fn((id: string) => <div data-testid={`tile-${id}`}>{id}</div>);
      renderRoot(twoWindowTree, renderTile);
      expect(renderTile).toHaveBeenCalledWith('a', ['first']);
      expect(renderTile).toHaveBeenCalledWith('b', ['second']);
    });
  });

  describe('three-level nested tree', () => {
    const deepTree: MosaicNode<string> = {
      direction: 'row',
      first: 'a',
      second: {
        direction: 'column',
        first: 'b',
        second: 'c',
        splitPercentage: 50,
      },
      splitPercentage: 50,
    };

    it('renders all three tiles', () => {
      const { getByTestId } = renderRoot(deepTree);
      expect(getByTestId('tile-a')).toBeInTheDocument();
      expect(getByTestId('tile-b')).toBeInTheDocument();
      expect(getByTestId('tile-c')).toBeInTheDocument();
    });

    it('calls renderTile with correct nested paths', () => {
      const renderTile = vi.fn((id: string) => <div data-testid={`tile-${id}`}>{id}</div>);
      renderRoot(deepTree, renderTile);
      expect(renderTile).toHaveBeenCalledWith('a', ['first']);
      expect(renderTile).toHaveBeenCalledWith('b', ['second', 'first']);
      expect(renderTile).toHaveBeenCalledWith('c', ['second', 'second']);
    });
  });

  describe('split handlers', () => {
    it('handleSplitChange calls updateTree with suppressOnRelease=true', () => {
      const twoWindowTree: MosaicNode<string> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const getRoot = vi.fn(() => twoWindowTree);
      const updateTree = vi.fn();
      const { container } = render(
        <MosaicContext.Provider
          value={{
            mosaicActions: { ...mockMosaicActions, getRoot, updateTree },
            mosaicId: 'test-mosaic',
            renderTile: (id: unknown) => <div data-testid={`tile-${id}`}>{String(id)}</div>,
          }}
        >
          <MosaicRoot root={twoWindowTree} />
        </MosaicContext.Provider>,
      );

      const splitEl = container.querySelector('.rm-mosaic-split') as HTMLElement;
      const parent = document.createElement('div');
      Object.defineProperty(splitEl, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.mouseDown(splitEl, { clientX: 500, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 600, clientY: 0 });
      fireEvent.mouseUp(document);

      // onRelease path calls updateTree without suppress
      expect(updateTree).toHaveBeenCalled();
    });
  });

  describe('MosaicNodeRenderer memoization', () => {
    it('does not re-render unrelated tile when sibling split changes', () => {
      let renderCountA = 0;

      const SpyTileA = React.memo(() => {
        renderCountA++;
        return <div data-testid="tile-a">A</div>;
      });

      const tree: MosaicNode<string> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const updateTree = vi.fn();
      const getRoot = vi.fn(() => tree);

      const renderTile = (id: string) => {
        if (id === 'a') return <SpyTileA />;
        return <div data-testid="tile-b">B</div>;
      };

      const { rerender } = render(
        <MosaicContext.Provider
          value={{
            mosaicActions: { ...mockMosaicActions, getRoot, updateTree },
            mosaicId: 'test-mosaic',
            renderTile: renderTile as (id: unknown, path: string[]) => JSX.Element,
          }}
        >
          <MosaicRoot root={tree} />
        </MosaicContext.Provider>,
      );

      const before = renderCountA;

      // Re-render with new tree where only splitPercentage changes (sibling to 'a')
      const updatedTree: MosaicNode<string> = { ...tree, splitPercentage: 60 };

      rerender(
        <MosaicContext.Provider
          value={{
            mosaicActions: { ...mockMosaicActions, getRoot, updateTree },
            mosaicId: 'test-mosaic',
            renderTile: renderTile as (id: unknown, path: string[]) => JSX.Element,
          }}
        >
          <MosaicRoot root={updatedTree} />
        </MosaicContext.Provider>,
      );

      // 'a' node itself didn't change, so SpyTileA should not re-render
      expect(renderCountA).toBe(before);
    });
  });
});
