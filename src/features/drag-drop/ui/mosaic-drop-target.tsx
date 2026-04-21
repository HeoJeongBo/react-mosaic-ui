import { createDragToUpdates } from '@/shared/lib';
import { MosaicContext } from '@/shared/lib/context';
import type { MosaicDragItem, MosaicPath } from '@/shared/types';
import { MosaicDropTargetPosition } from '@/shared/types';
import React, { useContext, useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';

export interface MosaicDropTargetProps {
  position: MosaicDropTargetPosition;
  path: MosaicPath;
  mosaicId: string;
  hitArea?: 'window' | 'viewport-edge';
}

const DRAG_ITEM_TYPE = 'MosaicWindow';

const MosaicDropTargetImpl = ({
  position,
  path,
  mosaicId,
  hitArea = 'window',
}: MosaicDropTargetProps) => {
  const { mosaicActions } = useContext(MosaicContext);
  const pathRef = useRef(path);
  pathRef.current = path;
  const mosaicActionsRef = useRef(mosaicActions);
  mosaicActionsRef.current = mosaicActions;

  const [{ isOver }, drop] = useDrop<MosaicDragItem, void, { isOver: boolean }>(
    () => ({
      accept: DRAG_ITEM_TYPE,
      canDrop: (item) => {
        if (item.mosaicId !== mosaicId) return false;
        const root = mosaicActionsRef.current.getRoot();
        if (!root) return false;
        return createDragToUpdates(root, item.path, pathRef.current, position).length > 0;
      },
      drop: (item) => {
        const root = mosaicActionsRef.current.getRoot();
        if (!root) return;

        const updates = createDragToUpdates(root, item.path, pathRef.current, position);
        if (updates.length === 0) return;
        mosaicActionsRef.current.updateTree(updates);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver() && monitor.canDrop(),
      }),
    }),
    [mosaicId, position],
  );

  const style = useMemo<React.CSSProperties>(
    () => ({
      ...getDropTargetStyle(position, isOver, hitArea),
      opacity: isOver ? 1 : 0,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      border: '2px solid rgba(59, 130, 246, 0.6)',
      borderRadius: '4px',
      transition: 'opacity 100ms ease-out',
    }),
    [position, isOver, hitArea],
  );

  return (
    <div
      ref={drop}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="rm-mosaic-drop-target rm-absolute"
      style={style}
    />
  );
};

export const MosaicDropTarget = React.memo(MosaicDropTargetImpl);

const EDGE_HIT_SIZE = '30%';
const EDGE_HOVER_SIZE = '50%';
const VIEWPORT_EDGE_HIT_SIZE = '24px';

export const getDropTargetStyle = (
  position: MosaicDropTargetPosition,
  isOver: boolean,
  hitArea: 'window' | 'viewport-edge' = 'window',
): React.CSSProperties => {
  // Match the original react-mosaic behavior:
  // default edge hit area is 30%, and hovered preview expands to 50%.
  const size =
    hitArea === 'viewport-edge'
      ? isOver
        ? EDGE_HOVER_SIZE
        : VIEWPORT_EDGE_HIT_SIZE
      : isOver
        ? EDGE_HOVER_SIZE
        : EDGE_HIT_SIZE;
  const baseStyle = { zIndex: 1000 };
  const oppositeInset = `calc(100% - ${size})`;

  switch (position) {
    case MosaicDropTargetPosition.TOP:
      return { ...baseStyle, top: 0, left: 0, right: 0, bottom: oppositeInset };
    case MosaicDropTargetPosition.BOTTOM:
      return { ...baseStyle, top: oppositeInset, left: 0, right: 0, bottom: 0 };
    case MosaicDropTargetPosition.LEFT:
      return { ...baseStyle, top: 0, right: oppositeInset, bottom: 0, left: 0 };
    case MosaicDropTargetPosition.RIGHT:
      return { ...baseStyle, top: 0, right: 0, bottom: 0, left: oppositeInset };
  }
};
