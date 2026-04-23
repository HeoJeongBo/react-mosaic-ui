import { MosaicContext } from '@/shared/lib/context';
import type { MosaicNode } from '@/shared/types';
import { MosaicDropTargetPosition } from '@/shared/types';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MosaicDropTarget } from './mosaic-drop-target';

afterEach(() => cleanup());

type DropSpec = {
  accept: string;
  canDrop?: (item: unknown) => boolean;
  drop?: (item: unknown) => void;
};
let capturedDropSpec: DropSpec | null = null;

vi.mock('react-dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dnd')>();
  return {
    ...actual,
    useDrop: vi.fn((specFn: () => DropSpec) => {
      const spec = specFn();
      capturedDropSpec = spec;
      return [{}, vi.fn()];
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

describe('MosaicDropTarget component', () => {
  it('renders a div with rm-mosaic-drop-target class', () => {
    const { container } = renderDropTarget();
    expect(container.querySelector('.rm-mosaic-drop-target')).toBeInTheDocument();
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

describe('CSS hover — no React re-render on drag events', () => {
  it('adds rm-drop-target--over class on dragenter', () => {
    const { container } = renderDropTarget();
    const el = container.querySelector('.rm-mosaic-drop-target') as HTMLElement;
    fireEvent.dragEnter(el);
    expect(el.classList.contains('rm-drop-target--over')).toBe(true);
  });

  it('removes rm-drop-target--over class on dragleave', () => {
    const { container } = renderDropTarget();
    const el = container.querySelector('.rm-mosaic-drop-target') as HTMLElement;
    fireEvent.dragEnter(el);
    fireEvent.dragLeave(el);
    expect(el.classList.contains('rm-drop-target--over')).toBe(false);
  });

  it('removes rm-drop-target--over class on drop', () => {
    const { container } = renderDropTarget();
    const el = container.querySelector('.rm-mosaic-drop-target') as HTMLElement;
    fireEvent.dragEnter(el);
    fireEvent.drop(el);
    expect(el.classList.contains('rm-drop-target--over')).toBe(false);
  });

  it('does not trigger React re-render on dragenter/dragleave', () => {
    let renderCount = 0;
    const TrackingWrapper = () => {
      renderCount++;
      return (
        <MosaicContext.Provider
          value={{
            mosaicActions: mockMosaicActions,
            mosaicId: 'test',
            renderTile: () => <></>,
          }}
        >
          <MosaicDropTarget position={MosaicDropTargetPosition.TOP} path={[]} mosaicId="test" />
        </MosaicContext.Provider>
      );
    };
    const { container } = render(<TrackingWrapper />);
    const before = renderCount;
    const el = container.querySelector('.rm-mosaic-drop-target') as HTMLElement;
    fireEvent.dragEnter(el);
    fireEvent.dragLeave(el);
    fireEvent.dragEnter(el);
    expect(renderCount).toBe(before);
  });
});

describe('data attributes', () => {
  it('sets data-position attribute', () => {
    const { container } = renderDropTarget({ position: MosaicDropTargetPosition.LEFT });
    const el = container.querySelector('.rm-mosaic-drop-target') as HTMLElement;
    expect(el.dataset.position).toBe('LEFT');
  });

  it('sets data-hit-area="window" by default', () => {
    const { container } = renderDropTarget();
    const el = container.querySelector('.rm-mosaic-drop-target') as HTMLElement;
    expect(el.dataset.hitArea).toBe('window');
  });

  it('sets data-hit-area="viewport-edge" when provided', () => {
    const { container } = renderDropTarget({ hitArea: 'viewport-edge' });
    const el = container.querySelector('.rm-mosaic-drop-target') as HTMLElement;
    expect(el.dataset.hitArea).toBe('viewport-edge');
  });
});
