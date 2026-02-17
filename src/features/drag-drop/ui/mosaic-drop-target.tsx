import { createDragToUpdates } from '@/shared/lib';
import { MosaicContext } from '@/shared/lib/context';
import type { MosaicDragItem, MosaicPath } from '@/shared/types';
import { MosaicDropTargetPosition } from '@/shared/types';
import React, { useContext } from 'react';
import { useDrop } from 'react-dnd';

export interface MosaicDropTargetProps {
  position: MosaicDropTargetPosition;
  path: MosaicPath;
  mosaicId: string;
}

const DRAG_ITEM_TYPE = 'MosaicWindow';

const MosaicDropTargetImpl = ({ position, path, mosaicId }: MosaicDropTargetProps) => {
  const { mosaicActions } = useContext(MosaicContext);

  const [{ isOver }, drop] = useDrop<MosaicDragItem, void, { isOver: boolean }>(
    () => ({
      accept: DRAG_ITEM_TYPE,
      canDrop: (item) => item.mosaicId === mosaicId,
      drop: (item) => {
        const root = mosaicActions.getRoot();
        if (!root) return;

        const updates = createDragToUpdates(root, item.path, path, position);
        mosaicActions.updateTree(updates);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver() && monitor.canDrop(),
      }),
    }),
    [mosaicId, mosaicActions, path, position],
  );

  return (
    <div
      ref={drop}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      className="rm-mosaic-drop-target rm-absolute"
      style={{
        ...getDropTargetStyle(position),
        opacity: isOver ? 1 : 0,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        border: '2px solid rgba(59, 130, 246, 0.6)',
        borderRadius: '4px',
        transition: 'opacity 100ms ease-out',
      }}
    />
  );
};

export const MosaicDropTarget = React.memo(MosaicDropTargetImpl);

const getDropTargetStyle = (position: MosaicDropTargetPosition): React.CSSProperties => {
  const baseStyle = {
    zIndex: 1000,
  };

  switch (position) {
    case MosaicDropTargetPosition.TOP:
      return {
        ...baseStyle,
        top: 0,
        left: 0,
        right: 0,
        height: '30%',
      };
    case MosaicDropTargetPosition.BOTTOM:
      return {
        ...baseStyle,
        bottom: 0,
        left: 0,
        right: 0,
        height: '30%',
      };
    case MosaicDropTargetPosition.LEFT:
      return {
        ...baseStyle,
        top: 0,
        bottom: 0,
        left: 0,
        width: '30%',
      };
    case MosaicDropTargetPosition.RIGHT:
      return {
        ...baseStyle,
        top: 0,
        bottom: 0,
        right: 0,
        width: '30%',
      };
  }
};
