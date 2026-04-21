import type { MosaicNode, MosaicPath } from '@/shared/types';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MosaicWindow } from '../../window/ui/mosaic-window';
import { Mosaic } from './mosaic';

afterEach(() => cleanup());

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn(() => [{ isOver: false }, vi.fn()]),
    useDrag: vi.fn(() => [{ isDragging: false }, vi.fn(), vi.fn()]),
  };
});

type TileId = 'a' | 'b' | 'c' | 'd';

const renderTile = (id: TileId, path: MosaicPath) => (
  <MosaicWindow title={`Window ${id}`} path={path}>
    <div data-testid={`tile-${id}`}>{id}</div>
  </MosaicWindow>
);

describe('Mosaic integration', () => {
  describe('full layout rendering', () => {
    it('renders 4 tiles for a balanced 4-leaf tree', () => {
      const tree: MosaicNode<TileId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
        second: {
          direction: 'column',
          first: 'c',
          second: 'd',
          splitPercentage: 50,
        },
        splitPercentage: 50,
      };

      render(<Mosaic value={tree} onChange={() => {}} renderTile={renderTile} />);

      expect(screen.getByTestId('tile-a')).toBeInTheDocument();
      expect(screen.getByTestId('tile-b')).toBeInTheDocument();
      expect(screen.getByTestId('tile-c')).toBeInTheDocument();
      expect(screen.getByTestId('tile-d')).toBeInTheDocument();
    });

    it('renders correct number of split bars for a 4-leaf tree', () => {
      const tree: MosaicNode<TileId> = {
        direction: 'row',
        first: { direction: 'column', first: 'a', second: 'b', splitPercentage: 50 },
        second: { direction: 'column', first: 'c', second: 'd', splitPercentage: 50 },
        splitPercentage: 50,
      };

      const { container } = render(
        <Mosaic value={tree} onChange={() => {}} renderTile={renderTile} />,
      );
      // 3 splits for 4 leaves
      const splits = container.querySelectorAll('.rm-mosaic-split');
      expect(splits).toHaveLength(3);
    });
  });

  describe('controlled mode — close tile', () => {
    it('removes a tile and updates the tree via onChange', () => {
      const tree: MosaicNode<TileId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const handleChange = vi.fn();

      render(<Mosaic value={tree} onChange={handleChange} renderTile={renderTile} />);

      // Click Close on tile 'a'
      const closeBtns = screen.getAllByTitle('Close');
      fireEvent.click(closeBtns[0]!);

      expect(handleChange).toHaveBeenCalledOnce();
      const newTree = handleChange.mock.calls[0]?.[0];
      // After removing 'a', tree should collapse to 'b'
      expect(newTree).toBe('b');
    });
  });

  describe('uncontrolled mode — remove tile', () => {
    it('removes a tile and re-renders with updated layout', async () => {
      const tree: MosaicNode<TileId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      render(<Mosaic initialValue={tree} renderTile={renderTile} />);

      expect(screen.getByTestId('tile-a')).toBeInTheDocument();
      expect(screen.getByTestId('tile-b')).toBeInTheDocument();

      const closeBtns = screen.getAllByTitle('Close');
      await act(async () => {
        fireEvent.click(closeBtns[0]!);
      });

      // tile-a removed, tile-b remains
      expect(screen.queryByTestId('tile-a')).not.toBeInTheDocument();
      expect(screen.getByTestId('tile-b')).toBeInTheDocument();
    });
  });

  describe('resize via Split', () => {
    it('calls onRelease with updated tree after drag', () => {
      const tree: MosaicNode<TileId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const onRelease = vi.fn();
      const { container } = render(
        <Mosaic value={tree} onChange={() => {}} onRelease={onRelease} renderTile={renderTile} />,
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

      expect(onRelease).toHaveBeenCalledOnce();
      const releasedTree = onRelease.mock.calls[0]?.[0] as MosaicNode<TileId>;
      expect(releasedTree).not.toBeNull();
    });
  });

  describe('expand tile', () => {
    it('calls onChange when Expand is clicked', () => {
      const tree: MosaicNode<TileId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };

      const onChange = vi.fn();
      const renderTileWithExpand = (id: TileId, path: MosaicPath) => (
        <MosaicWindow title={`Window ${id}`} path={path} createNode={() => 'new' as TileId}>
          <div data-testid={`tile-${id}`}>{id}</div>
        </MosaicWindow>
      );

      render(<Mosaic value={tree} onChange={onChange} renderTile={renderTileWithExpand} />);

      const expandBtns = screen.getAllByTitle('Expand');
      fireEvent.click(expandBtns[0]!);

      expect(onChange).toHaveBeenCalled();
      const newTree = onChange.mock.calls[0]?.[0] as MosaicNode<TileId>;
      // After expand, one pane should be larger
      expect(newTree).not.toBeNull();
    });
  });

  describe('controlled stateful wrapper', () => {
    it('renders and updates layout through parent state', async () => {
      const StatefulWrapper = () => {
        const [tree, setTree] = useState<MosaicNode<TileId> | null>({
          direction: 'row',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        });

        return <Mosaic value={tree} onChange={setTree} renderTile={renderTile} />;
      };

      render(<StatefulWrapper />);

      expect(screen.getByTestId('tile-a')).toBeInTheDocument();
      expect(screen.getByTestId('tile-b')).toBeInTheDocument();

      // Remove tile 'a'
      const closeBtns = screen.getAllByTitle('Close');
      await act(async () => {
        fireEvent.click(closeBtns[0]!);
      });

      expect(screen.queryByTestId('tile-a')).not.toBeInTheDocument();
      expect(screen.getByTestId('tile-b')).toBeInTheDocument();
    });
  });
});
