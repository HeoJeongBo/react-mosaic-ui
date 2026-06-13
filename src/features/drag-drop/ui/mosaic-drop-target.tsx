import { canDropOnTarget, createDragToUpdates } from '@/shared/lib';
import { MosaicContext } from '@/shared/lib/context';
import type { MosaicDragItem, MosaicDropTargetPosition, MosaicPath } from '@/shared/types';
import React, { useCallback, useContext, useRef } from 'react';
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
  const divRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef(path);
  pathRef.current = path;
  const mosaicActionsRef = useRef(mosaicActions);
  mosaicActionsRef.current = mosaicActions;
  // Store primitives in refs so useDrop spec never needs to be recreated.
  const positionRef = useRef(position);
  positionRef.current = position;
  const mosaicIdRef = useRef(mosaicId);
  mosaicIdRef.current = mosaicId;

  // No collect fn → isOver changes never trigger React re-renders.
  // Empty deps: all values are read from refs at call time, so the spec is
  // created once and never recreated — drop connector stays stable across renders.
  const [, drop] = useDrop<MosaicDragItem, void, void>(
    () => ({
      accept: DRAG_ITEM_TYPE,
      canDrop: (item) => {
        if (item.mosaicId !== mosaicIdRef.current) return false;
        const root = mosaicActionsRef.current.getRoot();
        if (!root) return false;
        // canDropOnTarget is O(depth×2) vs createDragToUpdates which is O(depth×2 + tree mutations).
        // canDrop is called 30-60×/s during hover; drop is called once on release.
        return canDropOnTarget(root, item.path, pathRef.current);
      },
      drop: (item) => {
        const root = mosaicActionsRef.current.getRoot();
        if (!root) return;
        const updates = createDragToUpdates(root, item.path, pathRef.current, positionRef.current);
        if (updates.length === 0) return;
        mosaicActionsRef.current.updateTree(updates);
      },
    }),
    [],
  );

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      drop(el);
      (divRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [drop],
  );

  const handleDragEnter = useCallback(() => {
    divRef.current?.classList.add('rm-drop-target--over');
  }, []);

  const handleDragLeave = useCallback(() => {
    divRef.current?.classList.remove('rm-drop-target--over');
  }, []);

  const handleDrop = useCallback(() => {
    divRef.current?.classList.remove('rm-drop-target--over');
  }, []);

  return (
    <div
      ref={setRef}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="rm-mosaic-drop-target"
      data-position={position}
      data-hit-area={hitArea}
    />
  );
};

export const MosaicDropTarget = React.memo(MosaicDropTargetImpl);
