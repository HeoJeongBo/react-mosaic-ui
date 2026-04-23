import { MosaicDropTarget, RootDropTargets } from '@/features/drag-drop';
import { Split } from '@/features/resize';
import { isParent } from '@/shared/lib';
import { areBoundingBoxesEqual, createBoundingBox, split } from '@/shared/lib/bounding-box';
import { MosaicContext } from '@/shared/lib/context';
import { arePathsEqual } from '@/shared/lib/mosaic-utilities';
import type { MosaicKey, MosaicNode, MosaicPath } from '@/shared/types';
import type { BoundingBox, ResizeOptions } from '@/shared/types';
import { MosaicDropTargetPosition } from '@/shared/types';
import React, { useCallback, useContext, useMemo, useRef } from 'react';

export interface MosaicRootProps<T extends MosaicKey> {
  root: MosaicNode<T> | null;
  className?: string;
  resize?: ResizeOptions;
}

const DEFAULT_RESIZE_OPTIONS: ResizeOptions = { minimumPaneSizePercentage: 20 };

export const MosaicRoot = <T extends MosaicKey>({
  root,
  className,
  resize = DEFAULT_RESIZE_OPTIONS,
}: MosaicRootProps<T>) => {
  const { mosaicId } = useContext(MosaicContext);
  const boundingBox = useMemo(() => createBoundingBox(0, 100, 100, 0), []);

  if (root === null) {
    return null;
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MosaicNodeRenderer
        node={root}
        path={[]}
        boundingBox={boundingBox}
        resize={resize}
        mosaicId={mosaicId}
      />
      <RootDropTargets />
    </div>
  );
};

interface MosaicNodeRendererProps<T extends MosaicKey> {
  node: MosaicNode<T>;
  path: MosaicPath;
  boundingBox: BoundingBox;
  resize: ResizeOptions;
  mosaicId: string;
}

const MosaicNodeRendererImpl = <T extends MosaicKey>({
  node,
  path,
  boundingBox,
  resize,
  mosaicId,
}: MosaicNodeRendererProps<T>) => {
  const { mosaicActions, renderTile } = useContext(MosaicContext);

  // path is a new array reference on every render even when content is identical.
  // Store in a ref so callbacks/memos read the latest value without being in deps.
  const pathRef = useRef(path);
  pathRef.current = path;

  // Stable string derived from path content — used as a dep so memos/callbacks only
  // invalidate when the actual path changes (e.g. node moves in the tree).
  const pathKey = path.join('/');

  const handleSplitChange = useCallback(
    (newPercentage: number) => {
      const root = mosaicActions.getRoot();
      if (!root) return;

      mosaicActions.updateTree(
        [
          {
            path: pathRef.current,
            spec: {
              splitPercentage: { $set: newPercentage },
            },
          },
        ],
        true,
      );
    },
    // pathRef.current always holds the latest path; pathKey triggers re-creation
    // only when path content changes, avoiding re-creation on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mosaicActions, pathKey],
  );

  const handleSplitRelease = useCallback(
    (newPercentage: number) => {
      const root = mosaicActions.getRoot();
      if (!root) return;

      mosaicActions.updateTree([
        {
          path: pathRef.current,
          spec: {
            splitPercentage: { $set: newPercentage },
          },
        },
      ]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mosaicActions, pathKey],
  );

  // Hooks must run unconditionally before any early return.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const firstPath = useMemo(() => [...pathRef.current, 'first'] as MosaicPath, [pathKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const secondPath = useMemo(() => [...pathRef.current, 'second'] as MosaicPath, [pathKey]);

  if (!isParent(node)) {
    return (
      <div
        className="rm-absolute rm-overflow-hidden"
        style={{
          top: `${boundingBox.top}%`,
          right: `${100 - boundingBox.right}%`,
          bottom: `${100 - boundingBox.bottom}%`,
          left: `${boundingBox.left}%`,
        }}
      >
        {renderTile(node as T, path)}
        <MosaicDropTarget position={MosaicDropTargetPosition.TOP} path={path} mosaicId={mosaicId} />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.BOTTOM}
          path={path}
          mosaicId={mosaicId}
        />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.LEFT}
          path={path}
          mosaicId={mosaicId}
        />
        <MosaicDropTarget
          position={MosaicDropTargetPosition.RIGHT}
          path={path}
          mosaicId={mosaicId}
        />
      </div>
    );
  }

  const splitPercentage = node.splitPercentage ?? 50;
  const [firstBox, secondBox] = split(boundingBox, splitPercentage, node.direction);

  return (
    <>
      <MosaicNodeRenderer
        node={node.first}
        path={firstPath}
        boundingBox={firstBox}
        resize={resize}
        mosaicId={mosaicId}
      />
      <Split
        direction={node.direction}
        percentage={splitPercentage}
        onChange={handleSplitChange}
        onRelease={handleSplitRelease}
        boundingBox={boundingBox}
        {...(resize.minimumPaneSizePercentage !== undefined && {
          minimumPaneSizePercentage: resize.minimumPaneSizePercentage,
        })}
      />
      <MosaicNodeRenderer
        node={node.second}
        path={secondPath}
        boundingBox={secondBox}
        resize={resize}
        mosaicId={mosaicId}
      />
    </>
  );
};

const MosaicNodeRenderer = React.memo(
  MosaicNodeRendererImpl,
  (prev, next) =>
    prev.node === next.node &&
    areBoundingBoxesEqual(prev.boundingBox, next.boundingBox) &&
    arePathsEqual(prev.path, next.path) &&
    prev.resize?.minimumPaneSizePercentage === next.resize?.minimumPaneSizePercentage &&
    prev.mosaicId === next.mosaicId,
) as typeof MosaicNodeRendererImpl;
