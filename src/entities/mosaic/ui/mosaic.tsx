import {
  createExpandUpdate,
  createHideUpdate,
  createRemoveUpdate,
  createReplaceUpdate,
  updateSplitPercentage,
  updateTree,
} from '@/shared/lib';
import { MosaicContext } from '@/shared/lib/context';
import type {
  CreateNode,
  MosaicDirection,
  MosaicKey,
  MosaicNode,
  MosaicPath,
  MosaicRootActions,
  MosaicUpdate,
  ResizeOptions,
  TileRenderer,
} from '@/shared/types';
import classNames from 'classnames';
import { createDragDropManager } from 'dnd-core';
import type { DragDropManager } from 'dnd-core';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MosaicRoot } from './mosaic-root';

export interface MosaicBaseProps<T extends MosaicKey> {
  renderTile: TileRenderer<T>;
  onChange?: (node: MosaicNode<T> | null) => void;
  onRelease?: (node: MosaicNode<T> | null) => void;
  className?: string;
  resize?: ResizeOptions;
  zeroStateView?: JSX.Element;
  mosaicId?: string;
  createNode?: CreateNode<T>;
  children?: React.ReactNode;
}

export interface MosaicControlledProps<T extends MosaicKey> extends MosaicBaseProps<T> {
  value: MosaicNode<T> | null;
  onChange: (node: MosaicNode<T> | null) => void;
}

export interface MosaicUncontrolledProps<T extends MosaicKey> extends MosaicBaseProps<T> {
  initialValue: MosaicNode<T> | null;
}

export type MosaicProps<T extends MosaicKey> =
  | MosaicControlledProps<T>
  | MosaicUncontrolledProps<T>;

// Module-level handler — avoids allocating a new function on every Mosaic render.
const preventDefaultHandler = (e: { preventDefault: () => void }) => e.preventDefault();

const isControlled = <T extends MosaicKey>(
  props: MosaicProps<T>,
): props is MosaicControlledProps<T> => {
  return 'value' in props;
};

const getBackend = () => {
  /* v8 ignore next 1 -- SSR path: window is always defined in the browser and jsdom */
  if (typeof window === 'undefined') return HTML5Backend;
  const isTouchOnly =
    'ontouchstart' in window &&
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(pointer: fine)').matches;
  return isTouchOnly ? TouchBackend : HTML5Backend;
};

export const Mosaic = <T extends MosaicKey>(props: MosaicProps<T>) => {
  const {
    renderTile,
    onChange,
    onRelease,
    className = 'react-mosaic',
    resize,
    zeroStateView,
    mosaicId = 'default-mosaic',
    children,
  } = props;

  const controlled = isControlled(props);
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;

  const [internalValue, setInternalValue] = useState<MosaicNode<T> | null>(
    controlled ? props.value : props.initialValue,
  );

  const currentValue = controlled ? props.value : internalValue;

  // Store callbacks in refs so mosaicActions/contextValue never need to be recreated.
  // This keeps MosaicContext stable and prevents context-triggered re-renders
  // in all consumers (MosaicWindow, MosaicWindowToolbar, MosaicDropTarget).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;
  const renderTileRef = useRef(renderTile);
  renderTileRef.current = renderTile;

  // Stable wrapper that never changes identity — reads latest renderTile from ref.
  const stableRenderTile = useMemo<TileRenderer<T>>(
    () => (node, path) => renderTileRef.current(node, path),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const currentValueRef = useRef(currentValue);
  currentValueRef.current = currentValue;

  // mosaicActions is created once and never changes — all external values
  // are read from refs at call-time.
  const mosaicActions: MosaicRootActions<T> = useMemo(
    () => ({
      expand: (path: MosaicPath, percentage?: number) => {
        const root = currentValueRef.current;
        if (root === null) return;
        const update = createExpandUpdate<T>(path, percentage);
        const newTree = updateTree(root, [update]);
        if (!controlledRef.current) setInternalValue(newTree);
        onChangeRef.current?.(newTree);
        onReleaseRef.current?.(newTree);
      },

      remove: (path: MosaicPath) => {
        const root = currentValueRef.current;
        if (root === null) return;
        try {
          const update = createRemoveUpdate(root, path);
          const newTree = updateTree(root, [update]);
          if (!controlledRef.current) setInternalValue(newTree);
          onChangeRef.current?.(newTree);
          onReleaseRef.current?.(newTree);
        } catch (e) {
          if (!controlledRef.current) setInternalValue(null);
          onChangeRef.current?.(null);
          onReleaseRef.current?.(null);
        }
      },

      hide: (path: MosaicPath) => {
        const root = currentValueRef.current;
        if (root === null) return;
        const update = createHideUpdate<T>(path);
        const newTree = updateTree(root, [update]);
        if (!controlledRef.current) setInternalValue(newTree);
        onChangeRef.current?.(newTree);
      },

      replaceWith: (path: MosaicPath, node: MosaicNode<T>) => {
        const root = currentValueRef.current;
        if (root === null) return;
        const update = createReplaceUpdate(path, node);
        const newTree = updateTree(root, [update]);
        if (!controlledRef.current) setInternalValue(newTree);
        onChangeRef.current?.(newTree);
        onReleaseRef.current?.(newTree);
      },

      updateTree: (updates: MosaicUpdate<T>[], suppressOnRelease = false) => {
        const root = currentValueRef.current;
        if (root === null) return;

        // resize tick (suppressOnRelease=true) with a single splitPercentage update:
        // use the shallow helper → preserves sibling subtree references without immer
        const u = updates[0];
        const uSpec = u !== undefined && !('$set' in u.spec) ? u.spec : undefined;
        const isSplitPercentageTick =
          suppressOnRelease && updates.length === 1 && uSpec?.splitPercentage !== undefined;

        const newTree =
          isSplitPercentageTick && u !== undefined && uSpec?.splitPercentage !== undefined
            ? updateSplitPercentage(root as MosaicNode<T>, u.path, uSpec.splitPercentage.$set)
            : updateTree(root, updates);

        if (!controlledRef.current) {
          if (suppressOnRelease) {
            startTransition(() => setInternalValue(newTree));
          } else {
            setInternalValue(newTree);
          }
        }
        onChangeRef.current?.(newTree);
        if (!suppressOnRelease) {
          onReleaseRef.current?.(newTree);
        }
      },

      getRoot: () => currentValueRef.current,

      add: (newNode: T, direction: MosaicDirection = 'row') => {
        const root = currentValueRef.current;
        if (root === null) {
          if (!controlledRef.current) setInternalValue(newNode);
          onChangeRef.current?.(newNode);
          onReleaseRef.current?.(newNode);
          return;
        }
        // Wrap existing root in a single new parent — existing subtree references
        // are preserved, so MosaicNodeRenderer memo (prev.node === next.node) passes
        // for all existing nodes and they skip re-render entirely.
        const newTree: MosaicNode<T> = {
          direction,
          first: root,
          second: newNode,
          splitPercentage: 50,
        };
        if (!controlledRef.current) setInternalValue(newTree);
        onChangeRef.current?.(newTree);
        onReleaseRef.current?.(newTree);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const contextValue = useMemo(
    () => ({
      mosaicActions,
      mosaicId,
      renderTile: stableRenderTile,
    }),
    [mosaicActions, mosaicId, stableRenderTile],
  );

  // Create a stable DnD manager that survives React 18 StrictMode double-mount.
  // DndProvider's cleanup tears down the backend during StrictMode, breaking drag.
  // Using useRef ensures the manager is created once and never torn down.
  const managerRef = useRef<DragDropManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = createDragDropManager(getBackend());
  }

  // Memoize the DndContext value so re-renders of Mosaic don't propagate
  // to every react-dnd consumer (useDrag/useDrop) via context change.
  const dndContextValue = useMemo(() => ({ dragDropManager: managerRef.current! }), []);

  // Toggle CSS class imperatively when dragging starts/stops.
  // This avoids React re-renders while enabling pointer-events on drop targets.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const monitor = managerRef.current!.getMonitor();
    let wasDragging = false;
    const unsubscribe = monitor.subscribeToStateChange(
      /* v8 ignore start */
      () => {
        const isDragging = monitor.isDragging();
        if (isDragging === wasDragging) return;
        wasDragging = isDragging;

        if (isDragging) {
          // Defer start: Chrome cancels drag if ancestor DOM is mutated
          // synchronously during the dragstart event.
          setTimeout(() => {
            containerRef.current?.classList.add('rm-dragging');
          }, 0);
        } else {
          // End: apply immediately for instant visual feedback.
          containerRef.current?.classList.remove('rm-dragging');
        }
      } /* v8 ignore stop */,
    );
    return unsubscribe;
  }, []);

  return (
    <DndContext.Provider value={dndContextValue}>
      <MosaicContext.Provider value={contextValue}>
        <div
          ref={containerRef}
          className={classNames(
            'react-mosaic',
            className !== 'react-mosaic' ? className : undefined,
          )}
          onDragOver={preventDefaultHandler}
          onDrop={preventDefaultHandler}
        >
          {currentValue === null ? (
            (zeroStateView ?? <div className="rm-mosaic-zero-state">Drop a window here</div>)
          ) : (
            <MosaicRoot root={currentValue} {...(resize !== undefined && { resize })} />
          )}
          {children}
        </div>
      </MosaicContext.Provider>
    </DndContext.Provider>
  );
};
