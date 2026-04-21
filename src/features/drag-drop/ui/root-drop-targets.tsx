import { MosaicContext } from '@/shared/lib/context';
import { MosaicDropTargetPosition } from '@/shared/types';
import React, { useContext } from 'react';
import { MosaicDropTarget } from './mosaic-drop-target';

/**
 * Root-level drop targets that span the entire layout.
 * Shown only during drag (controlled by rm-dragging CSS class on parent).
 * Dropping here splits the entire layout at the root level (path=[]).
 *
 * Inspired by react-mosaic's RootDropTargets component.
 */
const RootDropTargetsImpl = () => {
  const { mosaicId } = useContext(MosaicContext);

  return (
    <>
      <div
        className="rm-root-drop-targets rm-absolute"
        style={{ inset: 0, zIndex: 990, pointerEvents: 'none' }}
      >
        <MosaicDropTarget position={MosaicDropTargetPosition.TOP} path={[]} mosaicId={mosaicId} />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.BOTTOM}
          path={[]}
          mosaicId={mosaicId}
        />
        <MosaicDropTarget position={MosaicDropTargetPosition.LEFT} path={[]} mosaicId={mosaicId} />
        <MosaicDropTarget position={MosaicDropTargetPosition.RIGHT} path={[]} mosaicId={mosaicId} />
      </div>
      <div
        className="rm-viewport-edge-drop-targets"
        style={{ position: 'fixed', inset: 0, zIndex: 9990, pointerEvents: 'none' }}
      >
        <MosaicDropTarget
          position={MosaicDropTargetPosition.TOP}
          path={[]}
          mosaicId={mosaicId}
          hitArea="viewport-edge"
        />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.BOTTOM}
          path={[]}
          mosaicId={mosaicId}
          hitArea="viewport-edge"
        />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.LEFT}
          path={[]}
          mosaicId={mosaicId}
          hitArea="viewport-edge"
        />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.RIGHT}
          path={[]}
          mosaicId={mosaicId}
          hitArea="viewport-edge"
        />
      </div>
    </>
  );
};

export const RootDropTargets = React.memo(RootDropTargetsImpl);
