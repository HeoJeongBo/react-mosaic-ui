import { useDragSource } from '@/features/drag-drop';
import { getNodeAtPath } from '@/shared/lib';
import { MosaicContext, MosaicWindowContext } from '@/shared/lib/context';
import type { CreateNode, MosaicKey, MosaicPath } from '@/shared/types';
import type { MosaicWindowActions } from '@/shared/types';
import classNames from 'classnames';
import { type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export interface MosaicWindowProps<T extends MosaicKey> {
  title: string;
  path: MosaicPath;
  children: ReactNode;
  createNode?: CreateNode<T>;
  draggable?: boolean;
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

export const MosaicWindow = <T extends MosaicKey>({
  title,
  path,
  children,
  createNode,
  draggable = true,
  toolbarControls,
  additionalControls,
  renderToolbar,
  onDragStart,
  onDragEnd,
  className,
}: MosaicWindowProps<T>) => {
  const { mosaicActions, mosaicId } = useContext(MosaicContext);
  const dragOptions = {
    ...(onDragStart !== undefined && { onDragStart }),
    ...(onDragEnd !== undefined && { onDragEnd }),
  };
  const { isDragging, drag } = useDragSource(
    path,
    mosaicId,
    Object.keys(dragOptions).length > 0 ? dragOptions : undefined,
  );

  const split = useCallback(async () => {
    if (!createNode) {
      throw new Error('createNode is required for split operation');
    }

    const newNode = await createNode();
    const root = mosaicActions.getRoot();

    if (root === null) return;

    // Get current node at this path
    const currentNodeAtPath = getNodeAtPath(root, path);
    if (!currentNodeAtPath) return;

    mosaicActions.replaceWith(path, {
      direction: 'row',
      first: currentNodeAtPath,
      second: newNode,
      splitPercentage: 50,
    });
  }, [createNode, mosaicActions, path]);

  const replaceWithNew = useCallback(async () => {
    if (!createNode) {
      throw new Error('createNode is required for replace operation');
    }

    const newNode = await createNode();
    mosaicActions.replaceWith(path, newNode);
  }, [createNode, mosaicActions, path]);

  const getPath = useCallback(() => path, [path]);

  const connectDragSource = useCallback(
    (element: React.ReactElement) => {
      if (!draggable) {
        return element;
      }
      return drag(element);
    },
    [draggable, drag],
  );

  const windowActions: MosaicWindowActions = useMemo(
    () => ({
      split,
      replaceWithNew,
      getPath,
      connectDragSource,
    }),
    [split, replaceWithNew, getPath, connectDragSource],
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

  const defaultToolbar = <MosaicWindowToolbar {...toolbarProps} />;

  const toolbar = renderToolbar ? renderToolbar(toolbarProps, defaultToolbar) : defaultToolbar;

  return (
    <MosaicWindowContext.Provider value={contextValue}>
      <div
        className={classNames(
          'rm-mosaic-window',
          'rm-flex rm-flex-col rm-h-full rm-bg-mosaic-window rm-rounded rm-shadow',
          {
            'rm-opacity-50': isDragging,
          },
          className,
        )}
      >
        {toolbar}
        <div className="rm-mosaic-window-body rm-flex-1 rm-overflow-auto rm-p-4">{children}</div>
      </div>
    </MosaicWindowContext.Provider>
  );
};

const MosaicWindowToolbar = <T extends MosaicKey>({
  title,
  path,
  createNode,
  toolbarControls,
  additionalControls,
}: MosaicWindowToolbarProps<T>) => {
  const { mosaicActions } = useContext(MosaicContext);
  const { mosaicWindowActions } = useContext(MosaicWindowContext);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  const titleElement = mosaicWindowActions.connectDragSource(
    <div className="rm-mosaic-window-title rm-font-medium rm-text-sm rm-cursor-move">{title}</div>,
  );

  return (
    <>
      <div className="rm-mosaic-window-toolbar rm-flex rm-items-center rm-justify-between rm-px-4 rm-py-2 rm-bg-mosaic-toolbar rm-border-b rm-border-mosaic-border rm-select-none">
        {titleElement}
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
