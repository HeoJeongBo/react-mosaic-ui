import type { MosaicDirection } from '@/shared/types';
import classNames from 'classnames';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SplitProps {
  direction: MosaicDirection;
  percentage: number;
  onChange: (percentage: number) => void;
  onRelease?: (percentage: number) => void;
  boundingBox: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  minimumPaneSizePercentage?: number;
}

// Maps a pointer delta to a clamped split percentage. Shared by the mouse and
// touch handlers so the row/column formula and the clamp live in exactly one place.
function computeNewPercentage(params: {
  direction: MosaicDirection;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  startPercentage: number;
  parentRect: { width: number; height: number };
  parentWidth: number;
  parentHeight: number;
  minimumPaneSizePercentage: number;
}): number {
  const {
    direction,
    clientX,
    clientY,
    startX,
    startY,
    startPercentage,
    parentRect,
    parentWidth,
    parentHeight,
    minimumPaneSizePercentage,
  } = params;

  let next: number;
  if (direction === 'row') {
    const actualWidth = (parentRect.width * parentWidth) / 100;
    next = startPercentage + ((clientX - startX) / actualWidth) * 100;
  } else {
    const actualHeight = (parentRect.height * parentHeight) / 100;
    next = startPercentage + ((clientY - startY) / actualHeight) * 100;
  }
  return Math.max(minimumPaneSizePercentage, Math.min(100 - minimumPaneSizePercentage, next));
}

export const Split = ({
  direction,
  percentage,
  onChange,
  onRelease,
  boundingBox,
  minimumPaneSizePercentage = 20,
}: SplitProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [livePercentage, setLivePercentage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestPercentageRef = useRef(percentage);
  const rafIdRef = useRef<number | null>(null);
  // Stable ref so handleMouseDown/handleTouchStart don't need `percentage` in deps.
  const percentageRef = useRef(percentage);
  percentageRef.current = percentage;
  // Stable ref so handlers don't need `boundingBox` (new object each render) in deps.
  const boundingBoxRef = useRef(boundingBox);
  boundingBoxRef.current = boundingBox;

  const flushPendingChange = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      onChange(latestPercentageRef.current);
    }
  }, [onChange]);

  const scheduleChange = useCallback(
    (nextPercentage: number) => {
      latestPercentageRef.current = nextPercentage;

      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        setLivePercentage(latestPercentageRef.current);
        onChange(latestPercentageRef.current);
      });
    },
    [onChange],
  );

  useEffect(() => {
    if (!isDragging) {
      latestPercentageRef.current = percentage;
    }
  }, [isDragging, percentage]);

  useEffect(
    () => () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      // Get parent container size
      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      setIsDragging(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const startPercentage = percentageRef.current;
      const parentRect = parent.getBoundingClientRect();
      const parentWidth = boundingBoxRef.current.right - boundingBoxRef.current.left;
      const parentHeight = boundingBoxRef.current.bottom - boundingBoxRef.current.top;

      // Track the latest percentage during drag
      let latestPercentage = startPercentage;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        latestPercentage = computeNewPercentage({
          direction,
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          startX,
          startY,
          startPercentage,
          parentRect,
          parentWidth,
          parentHeight,
          minimumPaneSizePercentage,
        });
        scheduleChange(latestPercentage);
      };

      const handleMouseUp = () => {
        flushPendingChange();
        setIsDragging(false);
        setLivePercentage(null);
        onRelease?.(latestPercentage);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [direction, onRelease, minimumPaneSizePercentage, flushPendingChange, scheduleChange],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;

      // Get parent container size
      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      const touch = e.touches[0]!;
      setIsDragging(true);
      const startX = touch.clientX;
      const startY = touch.clientY;
      const startPercentage = percentageRef.current;
      const parentRect = parent.getBoundingClientRect();
      const parentWidth = boundingBoxRef.current.right - boundingBoxRef.current.left;
      const parentHeight = boundingBoxRef.current.bottom - boundingBoxRef.current.top;

      // Track the latest percentage during drag
      let latestPercentage = startPercentage;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length !== 1) return;
        moveEvent.preventDefault();

        const moveTouch = moveEvent.touches[0]!;
        latestPercentage = computeNewPercentage({
          direction,
          clientX: moveTouch.clientX,
          clientY: moveTouch.clientY,
          startX,
          startY,
          startPercentage,
          parentRect,
          parentWidth,
          parentHeight,
          minimumPaneSizePercentage,
        });
        scheduleChange(latestPercentage);
      };

      const handleTouchEnd = () => {
        flushPendingChange();
        setIsDragging(false);
        setLivePercentage(null);
        onRelease?.(latestPercentage);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    },
    [direction, onRelease, minimumPaneSizePercentage, flushPendingChange, scheduleChange],
  );

  // Keyboard operability for the role="separator" handle. Arrow keys nudge the
  // split (Shift = coarse 10% step), Home/End jump to the min/max pane size. Each
  // press is a discrete settle, so it mirrors a drag end: onChange then onRelease,
  // reusing the same clamp as the pointer handlers.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const min = minimumPaneSizePercentage;
      const max = 100 - minimumPaneSizePercentage;
      const step = e.shiftKey ? 10 : 1;
      const decKey = direction === 'row' ? 'ArrowLeft' : 'ArrowUp';
      const incKey = direction === 'row' ? 'ArrowRight' : 'ArrowDown';

      let next: number;
      if (e.key === decKey) next = percentageRef.current - step;
      else if (e.key === incKey) next = percentageRef.current + step;
      else if (e.key === 'Home') next = min;
      else if (e.key === 'End') next = max;
      else return;

      e.preventDefault();
      next = Math.max(min, Math.min(max, next));
      onChange(next);
      onRelease?.(next);
    },
    [direction, minimumPaneSizePercentage, onChange, onRelease],
  );

  const isRow = direction === 'row';
  const effectivePercentage = livePercentage ?? percentage;
  const splitPosition = isRow
    ? boundingBox.left + ((boundingBox.right - boundingBox.left) * effectivePercentage) / 100
    : boundingBox.top + ((boundingBox.bottom - boundingBox.top) * effectivePercentage) / 100;

  return (
    <div
      ref={containerRef}
      className={classNames('rm-mosaic-split', {
        'rm-cursor-col-resize': isRow,
        'rm-cursor-row-resize': !isRow,
        'rm-mosaic-split--active': isDragging,
      })}
      style={{
        ...(isRow
          ? {
              top: `${boundingBox.top}%`,
              bottom: `${100 - boundingBox.bottom}%`,
              left: `${splitPosition - 0.2}%`,
              width: 'var(--rm-split-size, 4px)',
            }
          : {
              left: `${boundingBox.left}%`,
              right: `${100 - boundingBox.right}%`,
              top: `${splitPosition - 0.2}%`,
              height: 'var(--rm-split-size, 4px)',
            }),
      }}
      role="separator"
      aria-orientation={isRow ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(effectivePercentage)}
      aria-valuemin={Math.round(minimumPaneSizePercentage)}
      aria-valuemax={Math.round(100 - minimumPaneSizePercentage)}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
    />
  );
};
