import type { MosaicDragItem, MosaicPath } from '@/shared/types';
import { useEffect, useRef } from 'react';
import { useDrag } from 'react-dnd';

const DRAG_ITEM_TYPE = 'MosaicWindow';

export interface UseDragSourceOptions {
  onDragStart?: () => void;
  onDragEnd?: (type: 'drop' | 'reset') => void;
}

export const useDragSource = (
  path: MosaicPath,
  mosaicId: string,
  options?: UseDragSourceOptions,
) => {
  const prevIsDragging = useRef(false);

  const [{ isDragging }, drag, preview] = useDrag<MosaicDragItem, void, { isDragging: boolean }>({
    type: DRAG_ITEM_TYPE,
    item: { path, mosaicId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    if (isDragging && !prevIsDragging.current) {
      options?.onDragStart?.();
    } else if (!isDragging && prevIsDragging.current) {
      options?.onDragEnd?.('drop');
    }
    prevIsDragging.current = isDragging;
  }, [isDragging, options]);

  return { isDragging, drag, preview };
};
