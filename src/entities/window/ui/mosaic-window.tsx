import { arePathsEqual, getNodeAtPath } from '@/shared/lib';
import { MosaicContext, MosaicWindowContext } from '@/shared/lib/context';
import type { CreateNode, MosaicDragItem, MosaicKey, MosaicPath } from '@/shared/types';
import type { MosaicWindowActions } from '@/shared/types';
import classNames from 'classnames';
import React, { type ReactNode, useContext, useMemo, useRef, useState } from 'react';
import { useDrag } from 'react-dnd';

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
  const { mosaicActions } = useContext(MosaicContext);

  // Store props in refs so windowActions (and therefore MosaicWindowContext)
  // never need to be recreated. This prevents context-triggered re-renders
  // of the toolbar, which would interrupt active drags.
  const pathRef = useRef(path);
  pathRef.current = path;
  const createNodeRef = useRef(createNode);
  createNodeRef.current = createNode;

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
    ...(createNode !== undefined && { createNode }),
    ...(toolbarControls !== undefined && { toolbarControls }),
    ...(additionalControls !== undefined && { additionalControls }),
  };

  const defaultToolbar = (
    <MosaicWindowToolbar
      {...toolbarProps}
      {...(onDragStart !== undefined && { onDragStart })}
      {...(onDragEnd !== undefined && { onDragEnd })}
    />
  );

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
  // Compare path using custom comparator
  if (!arePathsEqual(prev.path, next.path)) return false;

  // Skip callback props — they are forwarded to the toolbar which stores them
  // in refs, so new function references don't need to trigger a re-render.
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
  onDragStart,
  onDragEnd,
}: MosaicWindowToolbarProps<T> & {
  onDragStart?: () => void;
  onDragEnd?: (type: 'drop' | 'reset') => void;
}) => {
  const { mosaicActions, mosaicId } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Store all callback/array props in refs so useDrag deps stay minimal.
  // path is an array → new reference on every render even with identical values,
  // which would cause useDrag to re-register the drag source and kill active drags.
  const pathRef = useRef(path);
  pathRef.current = path;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

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
        <div ref={drag} className="rm-mosaic-window-title rm-font-medium rm-text-sm rm-cursor-move">
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
  // Compare path using custom comparator
  if (!arePathsEqual(prev.path, next.path)) return false;

  // Skip callback props — they are stored in refs inside the component,
  // so re-renders are not needed to pick up new references.
  const skipKeys = new Set(['path', 'onDragStart', 'onDragEnd']);
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (skipKeys.has(key)) continue;
    if (prev[key as keyof typeof prev] !== next[key as keyof typeof next]) {
      return false;
    }
  }

  return true;
}) as typeof MosaicWindowToolbarImpl;
