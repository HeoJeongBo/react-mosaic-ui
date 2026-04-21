import { MosaicContext } from '@/shared/lib/context';
import type { MosaicNode } from '@/shared/types';
import { MosaicDropTargetPosition } from '@/shared/types';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MosaicDropTarget, getDropTargetStyle } from './mosaic-drop-target';

afterEach(() => cleanup());

type DropSpec = {
  accept: string;
  canDrop?: (item: unknown) => boolean;
  drop?: (item: unknown) => void;
  collect?: (monitor: { isOver: () => boolean; canDrop: () => boolean }) => unknown;
};
let capturedDropSpec: DropSpec | null = null;

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn((specFn: () => DropSpec) => {
      const spec = specFn();
      capturedDropSpec = spec;
      // invoke collect to cover that branch
      const collectResult = spec.collect?.({ isOver: () => false, canDrop: () => true });
      return [collectResult ?? { isOver: false }, vi.fn()];
    }),
  };
});

const mockMosaicActions = {
  expand: vi.fn(),
  remove: vi.fn(),
  hide: vi.fn(),
  replaceWith: vi.fn(),
  updateTree: vi.fn(),
  getRoot: vi.fn(() => null as MosaicNode<string> | null),
};

function renderDropTarget(props: Partial<React.ComponentProps<typeof MosaicDropTarget>> = {}) {
  return render(
    <MosaicContext.Provider
      value={{
        mosaicActions: mockMosaicActions,
        mosaicId: 'test-mosaic',
        renderTile: () => <></>,
      }}
    >
      <MosaicDropTarget
        position={MosaicDropTargetPosition.TOP}
        path={[]}
        mosaicId="test-mosaic"
        {...props}
      />
    </MosaicContext.Provider>,
  );
}

describe('getDropTargetStyle', () => {
  it('uses 30% edge size when not hovered', () => {
    expect(getDropTargetStyle(MosaicDropTargetPosition.LEFT, false)).toMatchObject({
      left: 0,
      right: 'calc(100% - 30%)',
    });
    expect(getDropTargetStyle(MosaicDropTargetPosition.TOP, false)).toMatchObject({
      top: 0,
      bottom: 'calc(100% - 30%)',
    });
  });

  it('expands hovered target to 50% of the window edge', () => {
    expect(getDropTargetStyle(MosaicDropTargetPosition.RIGHT, true)).toMatchObject({
      right: 0,
      left: 'calc(100% - 50%)',
    });
    expect(getDropTargetStyle(MosaicDropTargetPosition.BOTTOM, true)).toMatchObject({
      bottom: 0,
      top: 'calc(100% - 50%)',
    });
  });

  it('uses a thin viewport hit strip and expands to 50% on hover', () => {
    expect(getDropTargetStyle(MosaicDropTargetPosition.LEFT, false, 'viewport-edge')).toMatchObject(
      {
        left: 0,
        right: 'calc(100% - 24px)',
      },
    );
    expect(getDropTargetStyle(MosaicDropTargetPosition.TOP, true, 'viewport-edge')).toMatchObject({
      top: 0,
      bottom: 'calc(100% - 50%)',
    });
  });

  it('covers all four positions for window hitArea', () => {
    for (const pos of [
      MosaicDropTargetPosition.TOP,
      MosaicDropTargetPosition.BOTTOM,
      MosaicDropTargetPosition.LEFT,
      MosaicDropTargetPosition.RIGHT,
    ]) {
      const style = getDropTargetStyle(pos, false, 'window');
      expect(style.zIndex).toBe(1000);
    }
  });
});

describe('MosaicDropTarget component', () => {
  it('renders a div with rm-mosaic-drop-target class', () => {
    const { container } = renderDropTarget();
    expect(container.querySelector('.rm-mosaic-drop-target')).toBeInTheDocument();
  });

  it('is not visible (opacity 0) when not hovered', () => {
    const { container } = renderDropTarget();
    const el = container.querySelector('.rm-mosaic-drop-target') as HTMLElement;
    expect(el.style.opacity).toBe('0');
  });

  it('renders for each drop target position', () => {
    for (const pos of [
      MosaicDropTargetPosition.TOP,
      MosaicDropTargetPosition.BOTTOM,
      MosaicDropTargetPosition.LEFT,
      MosaicDropTargetPosition.RIGHT,
    ]) {
      const { container } = renderDropTarget({ position: pos });
      expect(container.querySelector('.rm-mosaic-drop-target')).toBeInTheDocument();
      cleanup();
    }
  });

  it('renders with window hitArea by default', () => {
    const { container } = renderDropTarget({ hitArea: 'window' });
    expect(container.querySelector('.rm-mosaic-drop-target')).toBeInTheDocument();
  });

  it('renders with viewport-edge hitArea', () => {
    const { container } = renderDropTarget({ hitArea: 'viewport-edge' });
    expect(container.querySelector('.rm-mosaic-drop-target')).toBeInTheDocument();
  });

  it('canDrop returns false when mosaicId does not match', () => {
    mockMosaicActions.getRoot.mockReturnValue({
      direction: 'row' as const,
      first: 'a',
      second: 'b',
      splitPercentage: 50,
    });
    renderDropTarget({ path: ['first'], mosaicId: 'mosaic-A' });
    expect(capturedDropSpec).not.toBeNull();
    const result = capturedDropSpec!.canDrop?.({ mosaicId: 'mosaic-B', path: ['second'] });
    expect(result).toBe(false);
  });

  it('canDrop returns false when root is null', () => {
    mockMosaicActions.getRoot.mockReturnValue(null);
    renderDropTarget({ path: ['first'], mosaicId: 'test-mosaic' });
    const result = capturedDropSpec!.canDrop?.({ mosaicId: 'test-mosaic', path: ['second'] });
    expect(result).toBe(false);
  });

  it('canDrop returns true for valid drop', () => {
    mockMosaicActions.getRoot.mockReturnValue({
      direction: 'row' as const,
      first: 'a',
      second: 'b',
      splitPercentage: 50,
    });
    renderDropTarget({
      path: ['second'],
      mosaicId: 'test-mosaic',
      position: MosaicDropTargetPosition.LEFT,
    });
    const result = capturedDropSpec!.canDrop?.({ mosaicId: 'test-mosaic', path: ['first'] });
    expect(result).toBe(true);
  });

  it('drop calls updateTree when valid', () => {
    const root = { direction: 'row' as const, first: 'a', second: 'b', splitPercentage: 50 };
    mockMosaicActions.getRoot.mockReturnValue(root);
    renderDropTarget({
      path: ['second'],
      mosaicId: 'test-mosaic',
      position: MosaicDropTargetPosition.LEFT,
    });
    capturedDropSpec!.drop?.({ mosaicId: 'test-mosaic', path: ['first'] });
    expect(mockMosaicActions.updateTree).toHaveBeenCalled();
  });

  it('drop does nothing when root is null', () => {
    mockMosaicActions.getRoot.mockReturnValue(null);
    mockMosaicActions.updateTree.mockClear();
    renderDropTarget({
      path: ['second'],
      mosaicId: 'test-mosaic',
      position: MosaicDropTargetPosition.LEFT,
    });
    capturedDropSpec!.drop?.({ mosaicId: 'test-mosaic', path: ['first'] });
    expect(mockMosaicActions.updateTree).not.toHaveBeenCalled();
  });

  it('is memoized — wrapped in React.memo', () => {
    const memoSymbol = Symbol.for('react.memo');
    expect((MosaicDropTarget as unknown as { $$typeof: symbol }).$$typeof).toBe(memoSymbol);
  });
});
