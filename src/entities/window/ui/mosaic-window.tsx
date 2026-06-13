import { arePathsEqual, getNodeAtPath } from '@/shared/lib';
import { MosaicContext, MosaicWindowContext } from '@/shared/lib/context';
import type {
  CreateNode,
  DragBindings,
  MosaicDragItem,
  MosaicKey,
  MosaicPath,
} from '@/shared/types';
import type { MosaicWindowActions } from '@/shared/types';
import classNames from 'classnames';
import React, { type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useDrag } from 'react-dnd';

const DRAG_ITEM_TYPE = 'MosaicWindow';

// Pre-built key sets for memo comparators — avoids allocating new Set on every comparison call.
const MOSAIC_WINDOW_SKIP_KEYS = new Set<string>(['path', 'onDragStart', 'onDragEnd']);
const MOSAIC_TOOLBAR_SKIP_KEYS = new Set<string>(['path']);

export interface MosaicWindowProps<T extends MosaicKey> {
  title: string;
  path: MosaicPath;
  children: ReactNode;
  createNode?: CreateNode<T>;
  toolbarControls?: ReactNode;
  additionalControls?: ReactNode;
  renderToolbar?: (props: MosaicWindowToolbarProps<T>, defaultToolbar: ReactNode) => ReactNode;
  onDragStart?: () => void;
  onDragEnd?: (type: 'drop' | 'reset') => void;
  className?: string;
  closable?: boolean;
  /** When true, render no toolbar at all (no chrome, full bleed). */
  hideToolbar?: boolean;
  /** Extra class applied to the window body (alongside .rm-mosaic-window-body). */
  bodyClassName?: string;
  /** Inline padding override for the window body. Wins over CSS without !important. */
  bodyPadding?: string | number;
  /** Leaf ID of this window in the mosaic tree. Supplied by MosaicLayout for panel state persistence. */
  panelId?: T;
}

export interface MosaicWindowToolbarProps<T extends MosaicKey> {
  title: string;
  path: MosaicPath;
  createNode?: CreateNode<T>;
  toolbarControls?: ReactNode;
  additionalControls?: ReactNode;
  /** Attach dragHandle.ref to the element that should initiate dragging. */
  dragHandle: DragBindings;
  closable?: boolean;
}

const MosaicWindowImpl = <T extends MosaicKey>({
  title,
  path,
  children,
  createNode,
  toolbarControls,
  additionalControls,
  renderToolbar,
  onDragStart,
  onDragEnd,
  className,
  closable,
  hideToolbar,
  bodyClassName,
  bodyPadding,
  panelId,
}: MosaicWindowProps<T>) => {
  const { mosaicActions, mosaicId } = useContext(MosaicContext);

  // Store props in refs so windowActions / useDrag never need to be recreated.
  const pathRef = useRef(path);
  pathRef.current = path;
  const createNodeRef = useRef(createNode);
  createNodeRef.current = createNode;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  // useDrag lives here so dragHandle.ref can be passed into renderToolbar.
  // No collect fn → isDragging state stays inside the toolbar, not here.
  // This means MosaicWindowImpl (and its children) never re-render on drag.
  const [, drag] = useDrag<MosaicDragItem, void, void>(
    () => ({
      type: DRAG_ITEM_TYPE,
      item: () => {
        if (onDragStartRef.current) setTimeout(onDragStartRef.current, 0);
        return { path: pathRef.current, mosaicId };
      },
      end: (_item, monitor) => {
        if (monitor.didDrop()) {
          onDragEndRef.current?.('drop');
        } else {
          onDragEndRef.current?.('reset');
        }
      },
    }),
    [mosaicId],
  );

  // dragHandle is stable for the lifetime of the window (drag ref never changes).
  const dragHandle: DragBindings = useMemo(() => ({ ref: drag }), [drag]);

  const windowActions: MosaicWindowActions = useMemo(
    () => ({
      split: async () => {
        const currentCreateNode = createNodeRef.current;
        /* v8 ignore next 3 -- split is only triggered via the Split button which requires createNode */
        if (!currentCreateNode) {
          throw new Error('createNode is required for split operation');
        }
        const newNode = await currentCreateNode();
        const root = mosaicActions.getRoot();
        if (root === null) return;
        const currentPath = pathRef.current;
        const currentNodeAtPath = getNodeAtPath(root, currentPath);
        /* v8 ignore next 1 -- v8 reports a phantom branch on this guard; both outcomes are tested (split-success and getNodeAtPath-null) */
        if (!currentNodeAtPath) return;
        mosaicActions.replaceWith(currentPath, {
          direction: 'row',
          first: currentNodeAtPath,
          second: newNode,
          splitPercentage: 50,
        });
      },
      replaceWithNew: async () => {
        const currentCreateNode = createNodeRef.current;
        /* v8 ignore next 3 -- replaceWithNew is only called via the Replace button which requires createNode */
        if (!currentCreateNode) {
          throw new Error('createNode is required for replace operation');
        }
        const newNode = await currentCreateNode();
        mosaicActions.replaceWith(pathRef.current, newNode);
      },
      getPath: () => pathRef.current,
    }),
    [mosaicActions],
  );

  const contextValue = useMemo(
    () => ({
      mosaicWindowActions: windowActions,
      ...(panelId !== undefined && { panelId }),
    }),
    [windowActions, panelId],
  );

  const toolbarProps: MosaicWindowToolbarProps<T> = {
    title,
    path,
    dragHandle,
    ...(createNode !== undefined && { createNode }),
    ...(toolbarControls !== undefined && { toolbarControls }),
    ...(additionalControls !== undefined && { additionalControls }),
    ...(closable !== undefined && { closable }),
  };

  const defaultToolbar = <MosaicWindowToolbar {...toolbarProps} />;

  const toolbar = hideToolbar
    ? null
    : renderToolbar
      ? renderToolbar(toolbarProps, defaultToolbar)
      : defaultToolbar;

  return (
    <MosaicWindowContext.Provider value={contextValue}>
      <div className={classNames('rm-mosaic-window', className)}>
        {toolbar}
        <div
          className={classNames('rm-mosaic-window-body', bodyClassName)}
          style={bodyPadding !== undefined ? { padding: bodyPadding } : undefined}
        >
          {children}
        </div>
      </div>
    </MosaicWindowContext.Provider>
  );
};

export const MosaicWindow = React.memo(MosaicWindowImpl, (prev, next) => {
  if (!arePathsEqual(prev.path, next.path)) return false;

  // Skip callback props — stored in refs, new references don't need re-renders.
  for (const key of Object.keys(prev)) {
    if (MOSAIC_WINDOW_SKIP_KEYS.has(key)) continue;
    if (prev[key as keyof typeof prev] !== next[key as keyof typeof next]) return false;
  }
  for (const key of Object.keys(next)) {
    if (MOSAIC_WINDOW_SKIP_KEYS.has(key)) continue;
    if (!(key in prev)) return false;
  }

  return true;
}) as typeof MosaicWindowImpl;

const MosaicWindowToolbarImpl = <T extends MosaicKey>({
  title,
  path,
  createNode,
  toolbarControls,
  additionalControls,
  dragHandle,
  closable,
}: MosaicWindowToolbarProps<T>) => {
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // path comes as a new array reference each render; store in ref so callbacks
  // that read it don't need to list it as a dep (mosaicActions is already stable).
  const pathRef = useRef(path);
  pathRef.current = path;

  const handleExpand = useCallback(() => {
    mosaicActions.expand(pathRef.current);
  }, [mosaicActions]);

  const handleRemove = useCallback(() => {
    mosaicActions.remove(pathRef.current);
  }, [mosaicActions]);

  const handleSplit = useCallback(async () => {
    try {
      await mosaicWindowActions.split();
    } catch (error) {
      console.error('Split failed:', error);
    }
  }, [mosaicWindowActions]);

  const handleReplace = useCallback(async () => {
    try {
      await mosaicWindowActions.replaceWithNew();
    } catch (error) {
      console.error('Replace failed:', error);
    }
  }, [mosaicWindowActions]);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  return (
    <>
      <div className="rm-mosaic-window-toolbar">
        <div ref={dragHandle.ref} className="rm-mosaic-window-title">
          {title}
        </div>
        <div className="rm-mosaic-window-controls">
          {toolbarControls}
          {createNode && (
            <>
              <button
                type="button"
                className="rm-mosaic-button"
                onClick={handleReplace}
                title="Replace"
              >
                ↻
              </button>
              <button
                type="button"
                className="rm-mosaic-button"
                onClick={handleSplit}
                title="Split"
              >
                ⊞
              </button>
              <button
                type="button"
                className="rm-mosaic-button"
                onClick={handleExpand}
                title="Expand"
              >
                ⛶
              </button>
            </>
          )}
          {closable !== false && (
            <button
              type="button"
              className="rm-mosaic-button rm-mosaic-button--close"
              onClick={handleRemove}
              title="Close"
            >
              ✕
            </button>
          )}
          {additionalControls && (
            <button type="button" className="rm-mosaic-button" onClick={toggleDrawer} title="More">
              ⋯
            </button>
          )}
        </div>
      </div>
      {isDrawerOpen && additionalControls && (
        <div className="rm-mosaic-additional-controls">{additionalControls}</div>
      )}
    </>
  );
};

const MosaicWindowToolbar = React.memo(MosaicWindowToolbarImpl, (prev, next) => {
  if (!arePathsEqual(prev.path, next.path)) return false;

  // dragHandle.ref is stable (useDrag ref never changes).
  // isDragging is handled via CSS (.rm-dragging on the root container) — no re-render needed.
  /* v8 ignore start -- toolbarProps always differ in some value on re-render, so the
     loop exits early at the inner return; its natural-completion branch is unreachable */
  for (const key of Object.keys(prev)) {
    if (MOSAIC_TOOLBAR_SKIP_KEYS.has(key)) continue;
    if (prev[key as keyof typeof prev] !== next[key as keyof typeof next]) return false;
  }
  for (const key of Object.keys(next)) {
    if (MOSAIC_TOOLBAR_SKIP_KEYS.has(key)) continue;
    if (!(key in prev)) return false;
  }

  return true;
}) as typeof MosaicWindowToolbarImpl;
/* v8 ignore stop */
