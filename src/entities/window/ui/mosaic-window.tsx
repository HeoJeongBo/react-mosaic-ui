import {
  MOSAIC_DRAG_ITEM_TYPE,
  arePathsEqual,
  getNodeAtPath,
  shallowEqualSkipping,
} from '@/shared/lib';
import { ActiveWindowContext, MosaicContext, MosaicWindowContext } from '@/shared/lib/context';
import type {
  CreateNode,
  DragBindings,
  MosaicDragItem,
  MosaicKey,
  MosaicPath,
} from '@/shared/types';
import type { MosaicWindowActions } from '@/shared/types';
import classNames from 'classnames';
import React, {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDrag } from 'react-dnd';

// Pre-built key sets for memo comparators — avoids allocating new Set on every comparison call.
// Callback props are read from refs, so a new function identity never needs a re-render.
const MOSAIC_WINDOW_SKIP_KEYS = new Set<string>(['path', 'onDragStart', 'onDragEnd', 'onError']);
const MOSAIC_TOOLBAR_SKIP_KEYS = new Set<string>(['path', 'onError']);

/**
 * Props for {@link MosaicWindow} — the chrome (toolbar + body) wrapped around a tile.
 */
export interface MosaicWindowProps<T extends MosaicKey> {
  /** Title shown in the toolbar and used as the default accessible label. */
  title: string;
  /** Position of this window in the tree (received from `renderTile`). */
  path: MosaicPath;
  /** Window body content. */
  children: ReactNode;
  /** Factory for new tiles. Providing it enables the Split/Replace/Maximize toolbar buttons. */
  createNode?: CreateNode<T>;
  /** Extra controls rendered before the built-in toolbar buttons. */
  toolbarControls?: ReactNode;
  /** Controls shown in a collapsible drawer toggled by the “More” (⋯) button. */
  additionalControls?: ReactNode;
  /** Full toolbar override; receives the default toolbar as the second argument. Return `null` for no toolbar. */
  renderToolbar?: (props: MosaicWindowToolbarProps<T>, defaultToolbar: ReactNode) => ReactNode;
  /** Called when a drag of this window begins. */
  onDragStart?: () => void;
  /** Called when a drag of this window ends (`'drop'` if it landed, `'reset'` otherwise). */
  onDragEnd?: (type: 'drop' | 'reset') => void;
  /**
   * Called when a Split or Replace toolbar action fails — i.e. the `createNode`
   * factory rejects or throws. When omitted, the failure is logged with
   * `console.error` as a development fallback.
   */
  onError?: (error: unknown, action: 'split' | 'replace') => void;
  /** Extra class applied to the window root element. */
  className?: string;
  /** Show the Close (✕) button. Defaults to `true`. */
  closable?: boolean;
  /** When true, render no toolbar at all (no chrome, full bleed). */
  hideToolbar?: boolean;
  /** Extra class applied to the window body (alongside .rm-mosaic-window-body). */
  bodyClassName?: string;
  /** Inline padding override for the window body. Wins over CSS without !important. */
  bodyPadding?: string | number;
  /** Accessible label for this window's region. Defaults to `title`. */
  ariaLabel?: string;
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
  /** Forwarded from {@link MosaicWindowProps.onError}; reports Split/Replace failures. */
  onError?: (error: unknown, action: 'split' | 'replace') => void;
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
  onError,
  className,
  closable,
  hideToolbar,
  bodyClassName,
  bodyPadding,
  ariaLabel,
  panelId,
}: MosaicWindowProps<T>) => {
  const { mosaicActions, mosaicId } = useContext(MosaicContext);
  const activeWindowManager = useContext(ActiveWindowContext);

  // Root element ref — used to mark this window active on focus/pointer-down.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (el === null || activeWindowManager === null) return;
    const onActivate = (e: Event) => {
      // Skip activation for controls that opt out (e.g. Close) so an
      // about-to-be-removed window is not marked active just before it unmounts.
      if ((e.target as HTMLElement | null)?.closest('[data-rm-no-activate]')) return;
      activeWindowManager.activate(el);
    };
    // focusin (bubbles) covers keyboard/programmatic focus into any descendant;
    // pointerdown covers clicks on non-focusable body content.
    el.addEventListener('focusin', onActivate);
    el.addEventListener('pointerdown', onActivate);
    return () => {
      el.removeEventListener('focusin', onActivate);
      el.removeEventListener('pointerdown', onActivate);
      activeWindowManager.deactivate(el);
    };
  }, [activeWindowManager]);

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
      type: MOSAIC_DRAG_ITEM_TYPE,
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
        /* v8 ignore next 5 -- split is only triggered via the Split button which requires createNode */
        if (!currentCreateNode) {
          throw new Error(
            'Split requires a `createNode` factory on <MosaicWindow>. Provide createNode to enable the Split button.',
          );
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
        /* v8 ignore next 5 -- replaceWithNew is only called via the Replace button which requires createNode */
        if (!currentCreateNode) {
          throw new Error(
            'Replace requires a `createNode` factory on <MosaicWindow>. Provide createNode to enable the Replace button.',
          );
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
    ...(onError !== undefined && { onError }),
  };

  const defaultToolbar = <MosaicWindowToolbar {...toolbarProps} />;

  const toolbar = hideToolbar
    ? null
    : renderToolbar
      ? renderToolbar(toolbarProps, defaultToolbar)
      : defaultToolbar;

  return (
    <MosaicWindowContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        className={classNames('rm-mosaic-window', className)}
        // biome-ignore lint/a11y/useSemanticElements: .rm-mosaic-window is the public element consumers style; role="region" gives the same semantics without changing the div DOM contract.
        role="region"
        aria-label={ariaLabel ?? title}
      >
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
  // Callback props in the skip set are stored in refs — new identities don't re-render.
  return shallowEqualSkipping(prev, next, MOSAIC_WINDOW_SKIP_KEYS);
}) as typeof MosaicWindowImpl;

const MosaicWindowToolbarImpl = <T extends MosaicKey>({
  title,
  path,
  createNode,
  toolbarControls,
  additionalControls,
  dragHandle,
  closable,
  onError,
}: MosaicWindowToolbarProps<T>) => {
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // path comes as a new array reference each render; store in ref so callbacks
  // that read it don't need to list it as a dep (mosaicActions is already stable).
  const pathRef = useRef(path);
  pathRef.current = path;

  // onError read from a ref so handleSplit/handleReplace stay stable and a new
  // handler identity never re-renders the memoized toolbar (it is in the skip set).
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const reportActionError = useCallback((error: unknown, action: 'split' | 'replace') => {
    if (onErrorRef.current) {
      onErrorRef.current(error, action);
    } else {
      console.error(`${action === 'split' ? 'Split' : 'Replace'} failed:`, error);
    }
  }, []);

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
      reportActionError(error, 'split');
    }
  }, [mosaicWindowActions, reportActionError]);

  const handleReplace = useCallback(async () => {
    try {
      await mosaicWindowActions.replaceWithNew();
    } catch (error) {
      reportActionError(error, 'replace');
    }
  }, [mosaicWindowActions, reportActionError]);

  const handleMaximize = useCallback(() => {
    if (mosaicActions.isMaximized()) {
      mosaicActions.restore();
    } else {
      mosaicActions.maximize(pathRef.current);
    }
  }, [mosaicActions]);

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
                aria-label="Replace"
              >
                ↻
              </button>
              <button
                type="button"
                className="rm-mosaic-button"
                onClick={handleSplit}
                title="Split"
                aria-label="Split"
              >
                ⊞
              </button>
              <button
                type="button"
                className="rm-mosaic-button"
                onClick={handleExpand}
                title="Expand"
                aria-label="Expand"
              >
                ⛶
              </button>
              <button
                type="button"
                className="rm-mosaic-button"
                onClick={handleMaximize}
                title="Maximize"
                aria-label="Maximize"
              >
                ⤢
              </button>
            </>
          )}
          {closable !== false && (
            <button
              type="button"
              className="rm-mosaic-button rm-mosaic-button--close"
              onClick={handleRemove}
              // Don't let the close click mark this (about-to-be-removed) window active.
              data-rm-no-activate=""
              title="Close"
              aria-label="Close"
            >
              ✕
            </button>
          )}
          {additionalControls && (
            <button
              type="button"
              className="rm-mosaic-button"
              onClick={toggleDrawer}
              title="More"
              aria-label="More"
            >
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
  return shallowEqualSkipping(prev, next, MOSAIC_TOOLBAR_SKIP_KEYS);
}) as typeof MosaicWindowToolbarImpl;
