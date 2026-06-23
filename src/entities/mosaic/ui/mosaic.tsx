import {
  createExpandUpdate,
  createHideUpdate,
  createRemoveUpdate,
  createReplaceUpdate,
  getNodeAtPath,
  updateSplitPercentage,
  updateTree,
} from '@/shared/lib';
import { ActiveWindowContext, MosaicContext } from '@/shared/lib/context';
import type {
  ActiveWindowManager,
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

/** Props shared by the controlled and uncontrolled forms of {@link Mosaic}. */
export interface MosaicBaseProps<T extends MosaicKey> {
  /** Renders the content for a leaf tile, given its id and path in the tree. */
  renderTile: TileRenderer<T>;
  /** Called on every tree change (resize ticks included). */
  onChange?: (node: MosaicNode<T> | null) => void;
  /** Called once when an interaction (drag/resize) settles. */
  onRelease?: (node: MosaicNode<T> | null) => void;
  /** Extra class applied to the root `.react-mosaic` element. */
  className?: string;
  /** Resize constraints (e.g. minimum pane size). */
  resize?: ResizeOptions;
  /** Element rendered when the tree is empty. */
  zeroStateView?: JSX.Element;
  /** Stable id for this mosaic instance (used to scope drag-and-drop). */
  mosaicId?: string;
  /** Accessible label for the mosaic container (role="group"). Defaults to "Mosaic layout". */
  ariaLabel?: string;
  /**
   * Highlight the focused window with a persistent ring (helps disambiguate
   * similar panels). Toggled imperatively, so it causes no re-renders. Defaults
   * to `true`; set `false` to disable.
   */
  highlightActive?: boolean;
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

const ACTIVE_CLASS = 'rm-mosaic-window--active';

// Imperative active-window tracker. Toggles the highlight class directly on the
// DOM so activating a window never triggers a React re-render — same model as
// the `.rm-dragging` container toggle. `enabledRef` lets `highlightActive`
// change without recreating the manager. The highlight is a static ring (no
// animation), so removing a window never produces a flash.
const createActiveWindowManager = (enabledRef: {
  current: boolean;
}): ActiveWindowManager => {
  let current: HTMLElement | null = null;

  return {
    activate: (el) => {
      if (!enabledRef.current || el === null || el === current) return;
      if (current !== null) current.classList.remove(ACTIVE_CLASS);
      current = el;
      el.classList.add(ACTIVE_CLASS);
    },
    deactivate: (el) => {
      if (current === el) current = null;
      el.classList.remove(ACTIVE_CLASS);
    },
  };
};

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

/**
 * The core tiling window manager. Renders a binary tree of tiles with drag-and-drop
 * and resize. Works controlled (`value` + `onChange`) or uncontrolled (`initialValue`).
 *
 * To enable the Split/Replace/Maximize toolbar buttons on a tile, pass `createNode`
 * to the `<MosaicWindow>` rendered by your `renderTile` — not to `<Mosaic>`.
 */
export const Mosaic = <T extends MosaicKey>(props: MosaicProps<T>) => {
  const {
    renderTile,
    onChange,
    onRelease,
    className = 'react-mosaic',
    resize,
    zeroStateView,
    mosaicId = 'default-mosaic',
    ariaLabel,
    highlightActive = true,
    children,
  } = props;

  const controlled = isControlled(props);
  const controlledRef = useRef(controlled);
  controlledRef.current = controlled;

  // Dev-only footgun guard: switching a Mosaic between controlled (`value`) and
  // uncontrolled (`initialValue`) after mount is unsupported. `internalValue` is
  // seeded once from the first-render mode, so a later switch either strands a stale
  // internal tree (controlled→uncontrolled) or starts ignoring it (uncontrolled→
  // controlled). React's built-in inputs warn on this; we mirror that here.
  const prevControlledRef = useRef(controlled);
  if (process.env.NODE_ENV !== 'production' && prevControlledRef.current !== controlled) {
    const from = prevControlledRef.current ? 'controlled' : 'uncontrolled';
    const to = controlled ? 'controlled' : 'uncontrolled';
    console.warn(
      `[react-mosaic-ui] Mosaic is switching from ${from} to ${to}. Pick one mode for the component lifetime: controlled (\`value\` + \`onChange\`) or uncontrolled (\`initialValue\`). The switch is ignored and the internal tree may be stale.`,
    );
  }
  prevControlledRef.current = controlled;

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

  // maximize/restore: remember the full tree before maximizing a single tile.
  const preMaximizeTreeRef = useRef<MosaicNode<T> | null>(null);
  const isMaximizedRef = useRef(false);

  // Active-window highlight: a single imperative manager, created once. The
  // enabled flag is read through a ref so toggling `highlightActive` never
  // recreates the manager or the context value.
  const highlightActiveRef = useRef(highlightActive);
  highlightActiveRef.current = highlightActive;
  const activeManagerRef = useRef<ActiveWindowManager | null>(null);
  if (activeManagerRef.current === null) {
    activeManagerRef.current = createActiveWindowManager(highlightActiveRef);
  }

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

      maximize: (path: MosaicPath) => {
        const root = currentValueRef.current;
        if (root === null || path.length === 0) return;
        const leaf = getNodeAtPath(root, path);
        if (leaf === null) return;
        preMaximizeTreeRef.current = root;
        isMaximizedRef.current = true;
        if (!controlledRef.current) setInternalValue(leaf);
        onChangeRef.current?.(leaf);
        onReleaseRef.current?.(leaf);
      },

      restore: () => {
        if (!isMaximizedRef.current) return;
        const prev = preMaximizeTreeRef.current;
        isMaximizedRef.current = false;
        preMaximizeTreeRef.current = null;
        if (!controlledRef.current) setInternalValue(prev);
        onChangeRef.current?.(prev);
        onReleaseRef.current?.(prev);
      },

      isMaximized: () => isMaximizedRef.current,
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
        <ActiveWindowContext.Provider value={activeManagerRef.current}>
          <div
            ref={containerRef}
            className={classNames(
              'react-mosaic',
              className !== 'react-mosaic' ? className : undefined,
            )}
            onDragOver={preventDefaultHandler}
            onDrop={preventDefaultHandler}
            // biome-ignore lint/a11y/useSemanticElements: .react-mosaic is the public container element; role="group" gives grouping semantics without changing the div DOM contract.
            role="group"
            aria-label={ariaLabel ?? 'Mosaic layout'}
          >
            {currentValue === null ? (
              (zeroStateView ?? <div className="rm-mosaic-zero-state">Drop a window here</div>)
            ) : (
              <MosaicRoot root={currentValue} {...(resize !== undefined && { resize })} />
            )}
            {children}
          </div>
        </ActiveWindowContext.Provider>
      </MosaicContext.Provider>
    </DndContext.Provider>
  );
};
