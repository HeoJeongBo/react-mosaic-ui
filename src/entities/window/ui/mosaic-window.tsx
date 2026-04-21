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
import React, { type ReactNode, useContext, useMemo, useRef, useState } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';

const DRAG_ITEM_TYPE = 'MosaicWindow';

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
}

export interface MosaicWindowToolbarProps<T extends MosaicKey> {
  title: string;
  path: MosaicPath;
  createNode?: CreateNode<T>;
  toolbarControls?: ReactNode;
  additionalControls?: ReactNode;
  /** Attach dragHandle.ref to the element that should initiate dragging. */
  dragHandle: DragBindings;
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
        if (!currentCreateNode) {
          throw new Error('createNode is required for split operation');
        }
        const newNode = await currentCreateNode();
        const root = mosaicActions.getRoot();
        if (root === null) return;
        const currentPath = pathRef.current;
        const currentNodeAtPath = getNodeAtPath(root, currentPath);
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
    }),
    [windowActions],
  );

  const toolbarProps: MosaicWindowToolbarProps<T> = {
    title,
    path,
    dragHandle,
    ...(createNode !== undefined && { createNode }),
    ...(toolbarControls !== undefined && { toolbarControls }),
    ...(additionalControls !== undefined && { additionalControls }),
  };

  const defaultToolbar = <MosaicWindowToolbar {...toolbarProps} />;

  const toolbar = renderToolbar ? renderToolbar(toolbarProps, defaultToolbar) : defaultToolbar;

  return (
    <MosaicWindowContext.Provider value={contextValue}>
      <div
        className={classNames(
          'rm-mosaic-window',
          'rm-flex rm-flex-col rm-h-full rm-bg-mosaic-window rm-rounded rm-shadow',
          className,
        )}
      >
        {toolbar}
        <div className="rm-mosaic-window-body rm-flex-1 rm-overflow-auto rm-p-4">{children}</div>
      </div>
    </MosaicWindowContext.Provider>
  );
};

export const MosaicWindow = React.memo(MosaicWindowImpl, (prev, next) => {
  if (!arePathsEqual(prev.path, next.path)) return false;

  // Skip callback props — stored in refs, new references don't need re-renders.
  const skipKeys = new Set(['path', 'onDragStart', 'onDragEnd']);
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (skipKeys.has(key)) continue;
    if (prev[key as keyof typeof prev] !== next[key as keyof typeof next]) {
      return false;
    }
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
}: MosaicWindowToolbarProps<T>) => {
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // isDragging is subscribed here (toolbar scope only) so the window body
  // and children are never re-rendered when drag state changes.
  const { isDragging } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
  }));

  const handleExpand = () => {
    mosaicActions.expand(path);
  };

  const handleRemove = () => {
    mosaicActions.remove(path);
  };

  const handleSplit = async () => {
    try {
      await mosaicWindowActions.split();
    } catch (error) {
      console.error('Split failed:', error);
    }
  };

  const handleReplace = async () => {
    try {
      await mosaicWindowActions.replaceWithNew();
    } catch (error) {
      console.error('Replace failed:', error);
    }
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <>
      <div className="rm-mosaic-window-toolbar rm-flex rm-items-center rm-justify-between rm-px-4 rm-py-2 rm-bg-mosaic-toolbar rm-border-b rm-border-mosaic-border rm-select-none">
        <div
          ref={dragHandle.ref}
          className={`rm-mosaic-window-title rm-font-medium rm-text-sm rm-cursor-move${isDragging ? ' rm-opacity-50' : ''}`}
        >
          {title}
        </div>
        <div className="rm-mosaic-window-controls rm-flex rm-gap-1 rm-items-center">
          {toolbarControls}
          {createNode && (
            <>
              <button
                type="button"
                className="rm-mosaic-button rm-px-2 rm-py-1 rm-text-xs rm-rounded hover:rm-bg-gray-200 rm-transition"
                onClick={handleReplace}
                title="Replace"
              >
                ↻
              </button>
              <button
                type="button"
                className="rm-mosaic-button rm-px-2 rm-py-1 rm-text-xs rm-rounded hover:rm-bg-gray-200 rm-transition"
                onClick={handleSplit}
                title="Split"
              >
                ⊞
              </button>
              <button
                type="button"
                className="rm-mosaic-button rm-px-2 rm-py-1 rm-text-xs rm-rounded hover:rm-bg-gray-200 rm-transition"
                onClick={handleExpand}
                title="Expand"
              >
                ⛶
              </button>
            </>
          )}
          <button
            type="button"
            className="rm-mosaic-button rm-px-2 rm-py-1 rm-text-xs rm-rounded hover:rm-bg-red-200 rm-transition"
            onClick={handleRemove}
            title="Close"
          >
            ✕
          </button>
          {additionalControls && (
            <button
              type="button"
              className="rm-mosaic-button rm-px-2 rm-py-1 rm-text-xs rm-rounded hover:rm-bg-gray-200 rm-transition"
              onClick={toggleDrawer}
              title="More"
            >
              ⋯
            </button>
          )}
        </div>
      </div>
      {isDrawerOpen && additionalControls && (
        <div className="rm-mosaic-additional-controls rm-bg-mosaic-toolbar rm-border-b rm-border-mosaic-border rm-px-4 rm-py-2">
          {additionalControls}
        </div>
      )}
    </>
  );
};

const MosaicWindowToolbar = React.memo(MosaicWindowToolbarImpl, (prev, next) => {
  if (!arePathsEqual(prev.path, next.path)) return false;

  // dragHandle.ref is stable (useDrag ref doesn't change), but isDragging can change.
  // We include dragHandle in comparison so toolbar re-renders when isDragging flips.
  const skipKeys = new Set(['path']);
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (skipKeys.has(key)) continue;
    if (prev[key as keyof typeof prev] !== next[key as keyof typeof next]) {
      return false;
    }
  }

  return true;
}) as typeof MosaicWindowToolbarImpl;
