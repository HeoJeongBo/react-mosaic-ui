import { MosaicContext } from '@/shared/lib/context';
import { MosaicDropTargetPosition } from '@/shared/types';
import { useContext } from 'react';
import { MosaicDropTarget } from './mosaic-drop-target';

/**
 * Root-level drop targets that span the entire layout.
 * Shown only during drag (controlled by rm-dragging CSS class on parent).
 * Dropping here splits the entire layout at the root level (path=[]).
 *
 * Inspired by react-mosaic's RootDropTargets component.
 */
export const RootDropTargets = () => {
  const { mosaicId } = useContext(MosaicContext);

  return (
    <div
      className="rm-root-drop-targets rm-absolute"
      style={{ inset: 0, zIndex: 990, pointerEvents: 'none' }}
    >
      <MosaicDropTarget position={MosaicDropTargetPosition.TOP} path={[]} mosaicId={mosaicId} />
      <MosaicDropTarget position={MosaicDropTargetPosition.BOTTOM} path={[]} mosaicId={mosaicId} />
      <MosaicDropTarget position={MosaicDropTargetPosition.LEFT} path={[]} mosaicId={mosaicId} />
      <MosaicDropTarget position={MosaicDropTargetPosition.RIGHT} path={[]} mosaicId={mosaicId} />
    </div>
  );
};
