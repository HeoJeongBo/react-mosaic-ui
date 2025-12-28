import type { MosaicDirection } from '@/shared/types';
import classNames from 'classnames';
import { useCallback, useRef, useState } from 'react';

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

export const Split = ({
  direction,
  percentage,
  onChange,
  onRelease,
  boundingBox,
  minimumPaneSizePercentage = 20,
}: SplitProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startPercentage = percentage;

      // Get parent container size
      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const parentWidth = boundingBox.right - boundingBox.left;
      const parentHeight = boundingBox.bottom - boundingBox.top;

      // Track the latest percentage during drag
      let latestPercentage = startPercentage;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        let newPercentage: number;

        if (direction === 'row') {
          const deltaX = moveEvent.clientX - startX;
          const actualWidth = (parentRect.width * parentWidth) / 100;
          const deltaPercentage = (deltaX / actualWidth) * 100;
          newPercentage = startPercentage + deltaPercentage;
        } else {
          const deltaY = moveEvent.clientY - startY;
          const actualHeight = (parentRect.height * parentHeight) / 100;
          const deltaPercentage = (deltaY / actualHeight) * 100;
          newPercentage = startPercentage + deltaPercentage;
        }

        // Clamp between minimum sizes
        newPercentage = Math.max(
          minimumPaneSizePercentage,
          Math.min(100 - minimumPaneSizePercentage, newPercentage),
        );

        latestPercentage = newPercentage;
        onChange(newPercentage);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        onRelease?.(latestPercentage);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [direction, percentage, onChange, onRelease, minimumPaneSizePercentage, boundingBox],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;

      const touch = e.touches[0]!;
      setIsDragging(true);

      const startX = touch.clientX;
      const startY = touch.clientY;
      const startPercentage = percentage;

      // Get parent container size
      const parent = containerRef.current?.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const parentWidth = boundingBox.right - boundingBox.left;
      const parentHeight = boundingBox.bottom - boundingBox.top;

      // Track the latest percentage during drag
      let latestPercentage = startPercentage;

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length !== 1) return;

        const moveTouch = moveEvent.touches[0]!;
        let newPercentage: number;

        if (direction === 'row') {
          const deltaX = moveTouch.clientX - startX;
          const actualWidth = (parentRect.width * parentWidth) / 100;
          const deltaPercentage = (deltaX / actualWidth) * 100;
          newPercentage = startPercentage + deltaPercentage;
        } else {
          const deltaY = moveTouch.clientY - startY;
          const actualHeight = (parentRect.height * parentHeight) / 100;
          const deltaPercentage = (deltaY / actualHeight) * 100;
          newPercentage = startPercentage + deltaPercentage;
        }

        newPercentage = Math.max(
          minimumPaneSizePercentage,
          Math.min(100 - minimumPaneSizePercentage, newPercentage),
        );

        latestPercentage = newPercentage;
        onChange(newPercentage);
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        onRelease?.(latestPercentage);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    },
    [direction, percentage, onChange, onRelease, minimumPaneSizePercentage, boundingBox],
  );

  const isRow = direction === 'row';
  const splitPosition = isRow
    ? boundingBox.left + ((boundingBox.right - boundingBox.left) * percentage) / 100
    : boundingBox.top + ((boundingBox.bottom - boundingBox.top) * percentage) / 100;

  return (
    <div
      ref={containerRef}
      className={classNames(
        'rm-mosaic-split',
        'rm-absolute rm-bg-mosaic-split rm-transition-colors',
        {
          'rm-cursor-col-resize': isRow,
          'rm-cursor-row-resize': !isRow,
          'rm-bg-mosaic-split-hover': isDragging,
        },
      )}
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
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    />
  );
};
