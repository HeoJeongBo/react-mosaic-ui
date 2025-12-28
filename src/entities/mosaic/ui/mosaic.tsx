import {
  createExpandUpdate,
  createHideUpdate,
  createRemoveUpdate,
  createReplaceUpdate,
  updateTree,
} from '@/shared/lib';
import { MosaicContext } from '@/shared/lib/context';
import type {
  CreateNode,
  MosaicKey,
  MosaicNode,
  MosaicPath,
  MosaicRootActions,
  MosaicUpdate,
  ResizeOptions,
  TileRenderer,
} from '@/shared/types';
import classNames from 'classnames';
import { useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MosaicRoot } from './mosaic-root';

export interface MosaicBaseProps<T extends MosaicKey> {
  renderTile: TileRenderer<T>;
  onChange?: (node: MosaicNode<T> | null) => void;
  onRelease?: (node: MosaicNode<T> | null) => void;
  className?: string;
  resize?: ResizeOptions;
  zeroStateView?: JSX.Element;
  mosaicId?: string;
  createNode?: CreateNode<T>;
}

export interface MosaicControlledProps<T extends MosaicKey> extends MosaicBaseProps<T> {
  value: MosaicNode<T> | null;
  onChange: (node: MosaicNode<T> | null) => void;
}

export interface MosaicUncontrolledProps<T extends MosaicKey> extends MosaicBaseProps<T> {
  initialValue: MosaicNode<T> | null;
}

export type MosaicProps<T extends MosaicKey> =
  | MosaicControlledProps<T>
  | MosaicUncontrolledProps<T>;

const isControlled = <T extends MosaicKey>(
  props: MosaicProps<T>,
): props is MosaicControlledProps<T> => {
  return 'value' in props;
};

export const Mosaic = <T extends MosaicKey>(props: MosaicProps<T>) => {
  const {
    renderTile,
    onChange,
    onRelease,
    className = 'react-mosaic',
    zeroStateView,
    mosaicId = 'default-mosaic',
  } = props;

  const [internalValue, setInternalValue] = useState<MosaicNode<T> | null>(
    isControlled(props) ? props.value : props.initialValue,
  );

  const currentValue = isControlled(props) ? props.value : internalValue;

  const handleChange = useCallback(
    (newValue: MosaicNode<T> | null) => {
      if (!isControlled(props)) {
        setInternalValue(newValue);
      }
      onChange?.(newValue);
    },
    [onChange, props],
  );

  const handleRelease = useCallback(
    (newValue: MosaicNode<T> | null) => {
      onRelease?.(newValue);
    },
    [onRelease],
  );

  const mosaicActions: MosaicRootActions<T> = useMemo(
    () => ({
      expand: (path: MosaicPath, percentage?: number) => {
        if (currentValue === null) return;
        const update = createExpandUpdate<T>(path, percentage);
        const newTree = updateTree(currentValue, [update]);
        handleChange(newTree);
        handleRelease(newTree);
      },

      remove: (path: MosaicPath) => {
        if (currentValue === null) return;
        try {
          const update = createRemoveUpdate(currentValue, path);
          const newTree = updateTree(currentValue, [update]);
          handleChange(newTree);
          handleRelease(newTree);
        } catch (e) {
          // If removing fails, set to null
          handleChange(null);
          handleRelease(null);
        }
      },

      hide: (path: MosaicPath) => {
        if (currentValue === null) return;
        const update = createHideUpdate<T>(path);
        const newTree = updateTree(currentValue, [update]);
        handleChange(newTree);
      },

      replaceWith: (path: MosaicPath, node: MosaicNode<T>) => {
        if (currentValue === null) return;
        const update = createReplaceUpdate(path, node);
        const newTree = updateTree(currentValue, [update]);
        handleChange(newTree);
        handleRelease(newTree);
      },

      updateTree: (updates: MosaicUpdate<T>[], suppressOnRelease = false) => {
        if (currentValue === null) return;
        const newTree = updateTree(currentValue, updates);
        handleChange(newTree);
        if (!suppressOnRelease) {
          handleRelease(newTree);
        }
      },

      getRoot: () => currentValue,
    }),
    [currentValue, handleChange, handleRelease],
  );

  const contextValue = useMemo(
    () => ({
      mosaicActions,
      mosaicId,
    }),
    [mosaicActions, mosaicId],
  );

  // Detect touch support
  const isTouchDevice =
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const backend = isTouchDevice ? TouchBackend : HTML5Backend;

  return (
    <DndProvider backend={backend}>
      <MosaicContext.Provider value={contextValue}>
        <div className={classNames(className, 'rm-w-full rm-h-full rm-relative')}>
          {currentValue === null ? (
            (zeroStateView ?? (
              <div className="rm-flex rm-items-center rm-justify-center rm-w-full rm-h-full rm-text-gray-500">
                Drop a window here
              </div>
            ))
          ) : (
            <MosaicRoot
              root={currentValue}
              renderTile={renderTile}
              className="rm-w-full rm-h-full"
            />
          )}
        </div>
      </MosaicContext.Provider>
    </DndProvider>
  );
};
