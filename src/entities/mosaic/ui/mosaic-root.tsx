import { MosaicDropTarget } from '@/features/drag-drop';
import { Split } from '@/features/resize';
import { isParent } from '@/shared/lib';
import { createBoundingBox, split } from '@/shared/lib/bounding-box';
import { MosaicContext } from '@/shared/lib/context';
import type { MosaicKey, MosaicNode, MosaicPath } from '@/shared/types';
import type { BoundingBox, ResizeOptions } from '@/shared/types';
import { MosaicDropTargetPosition } from '@/shared/types';
import { useCallback, useContext, useMemo } from 'react';

export interface MosaicRootProps<T extends MosaicKey> {
  root: MosaicNode<T> | null;
  renderTile: (id: T, path: MosaicPath) => JSX.Element;
  className?: string;
  resize?: ResizeOptions;
}

export const MosaicRoot = <T extends MosaicKey>({
  root,
  renderTile,
  className,
  resize = { minimumPaneSizePercentage: 20 },
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
        renderTile={renderTile}
        resize={resize}
        mosaicId={mosaicId}
      />
    </div>
  );
};

interface MosaicNodeRendererProps<T extends MosaicKey> {
  node: MosaicNode<T>;
  path: MosaicPath;
  boundingBox: BoundingBox;
  renderTile: (id: T, path: MosaicPath) => JSX.Element;
  resize: ResizeOptions;
  mosaicId: string;
}

const MosaicNodeRenderer = <T extends MosaicKey>({
  node,
  path,
  boundingBox,
  renderTile,
  resize,
  mosaicId,
}: MosaicNodeRendererProps<T>) => {
  const { mosaicActions } = useContext(MosaicContext);

  const handleSplitChange = useCallback(
    (newPercentage: number) => {
      const root = mosaicActions.getRoot();
      if (!root) return;

      mosaicActions.updateTree(
        [
          {
            path,
            spec: {
              splitPercentage: { $set: newPercentage },
            },
          },
        ],
        true, // suppress onRelease
      );
    },
    [mosaicActions, path],
  );

  const handleSplitRelease = useCallback(
    (newPercentage: number) => {
      const root = mosaicActions.getRoot();
      if (!root) return;

      mosaicActions.updateTree([
        {
          path,
          spec: {
            splitPercentage: { $set: newPercentage },
          },
        },
      ]);
    },
    [mosaicActions, path],
  );

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
        {renderTile(node, path)}
        {/* Drop targets for all four sides */}
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
        path={[...path, 'first']}
        boundingBox={firstBox}
        renderTile={renderTile}
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
        path={[...path, 'second']}
        boundingBox={secondBox}
        renderTile={renderTile}
        resize={resize}
        mosaicId={mosaicId}
      />
    </>
  );
};
