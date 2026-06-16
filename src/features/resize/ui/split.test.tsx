import { createBoundingBox } from '@/shared/lib/bounding-box';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Split } from './split';

const defaultBox = createBoundingBox(0, 100, 100, 0);

function renderSplit(props: Partial<React.ComponentProps<typeof Split>> = {}) {
  const onChange = vi.fn();
  const onRelease = vi.fn();
  const result = render(
    <Split
      direction="row"
      percentage={50}
      onChange={onChange}
      onRelease={onRelease}
      boundingBox={defaultBox}
      {...props}
    />,
  );
  return { ...result, onChange, onRelease };
}

afterEach(() => cleanup());

describe('Split', () => {
  describe('rendering', () => {
    it('applies col-resize cursor for row direction', () => {
      const { container } = renderSplit({ direction: 'row' });
      expect(container.firstChild).toHaveClass('rm-cursor-col-resize');
    });

    it('applies row-resize cursor for column direction', () => {
      const { container } = renderSplit({ direction: 'column' });
      expect(container.firstChild).toHaveClass('rm-cursor-row-resize');
    });

    it('positions split bar based on boundingBox and percentage for row', () => {
      const { container } = renderSplit({ direction: 'row', percentage: 50 });
      const el = container.firstChild as HTMLElement;
      // splitPosition = left + (right-left)*50/100 = 0 + 100*0.5 = 50
      // style.left = `${50 - 0.2}%` = `49.8%`
      expect(el.style.left).toBe('49.8%');
    });

    it('positions split bar based on boundingBox and percentage for column', () => {
      const { container } = renderSplit({ direction: 'column', percentage: 40 });
      const el = container.firstChild as HTMLElement;
      // splitPosition = top + (bottom-top)*40/100 = 0 + 100*0.4 = 40
      expect(el.style.top).toBe('39.8%');
    });

    it('renders with rm-mosaic-split class', () => {
      const { container } = renderSplit();
      expect(container.firstChild).toHaveClass('rm-mosaic-split');
    });

    it('exposes a separator role with vertical orientation for row direction', () => {
      const { container } = renderSplit({ direction: 'row', percentage: 50 });
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('role')).toBe('separator');
      expect(el.getAttribute('aria-orientation')).toBe('vertical');
      expect(el.getAttribute('aria-valuenow')).toBe('50');
      expect(el.getAttribute('aria-valuemin')).toBe('20');
      expect(el.getAttribute('aria-valuemax')).toBe('80');
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('exposes horizontal orientation for column direction', () => {
      const { container } = renderSplit({ direction: 'column' });
      const el = container.firstChild as HTMLElement;
      expect(el.getAttribute('aria-orientation')).toBe('horizontal');
    });
  });

  describe('mouse drag', () => {
    it('calls onChange during mouse drag', () => {
      const { container, onChange } = renderSplit({ direction: 'row', percentage: 50 });
      const el = container.firstChild as HTMLElement;

      // Mock parent with getBoundingClientRect
      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.mouseDown(el, { clientX: 500, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 600, clientY: 0 });
      fireEvent.mouseUp(document);

      expect(onChange).toHaveBeenCalled();
    });

    it('calls onRelease on mouseup', () => {
      const { container, onRelease } = renderSplit({ direction: 'row', percentage: 50 });
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.mouseDown(el, { clientX: 500, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 600, clientY: 0 });
      fireEvent.mouseUp(document);

      expect(onRelease).toHaveBeenCalledOnce();
    });

    it('clamps percentage to minimumPaneSizePercentage', () => {
      const { container, onChange } = renderSplit({
        direction: 'row',
        percentage: 50,
        minimumPaneSizePercentage: 20,
      });
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      // Move far left to trigger minimum clamp
      fireEvent.mouseDown(el, { clientX: 500, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
      fireEvent.mouseUp(document);

      const calls = onChange.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0] as number;
      expect(lastCall).toBeGreaterThanOrEqual(20);
    });

    it('clamps percentage to maximum (100 - minimum)', () => {
      const { container, onRelease } = renderSplit({
        direction: 'row',
        percentage: 50,
        minimumPaneSizePercentage: 20,
      });
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      // Move far right to trigger maximum clamp
      fireEvent.mouseDown(el, { clientX: 500, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 2000, clientY: 0 });
      fireEvent.mouseUp(document);

      const lastValue = onRelease.mock.calls[0]?.[0] as number;
      expect(lastValue).toBeLessThanOrEqual(80);
    });

    it('adds isDragging class during drag', () => {
      const { container } = renderSplit();
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.mouseDown(el, { clientX: 500, clientY: 0 });
      expect(el).toHaveClass('rm-mosaic-split--active');

      fireEvent.mouseUp(document);
      expect(el).not.toHaveClass('rm-mosaic-split--active');
    });

    it('does nothing when parentElement is null', () => {
      const { container, onChange } = renderSplit();
      const el = container.firstChild as HTMLElement;
      Object.defineProperty(el, 'parentElement', { get: () => null, configurable: true });

      fireEvent.mouseDown(el, { clientX: 500, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 600, clientY: 0 });
      fireEvent.mouseUp(document);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('handles column direction drag', () => {
      const { container, onChange } = renderSplit({ direction: 'column', percentage: 50 });
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.mouseDown(el, { clientX: 0, clientY: 300 });
      fireEvent.mouseMove(document, { clientX: 0, clientY: 360 });
      fireEvent.mouseUp(document);

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('touch drag', () => {
    it('calls onChange and onRelease during touch drag', () => {
      const { container, onChange, onRelease } = renderSplit({ direction: 'row', percentage: 50 });
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.touchStart(el, { touches: [{ clientX: 500, clientY: 0 }] });
      fireEvent.touchMove(document, { touches: [{ clientX: 600, clientY: 0 }] });
      fireEvent.touchEnd(document);

      expect(onChange).toHaveBeenCalled();
      expect(onRelease).toHaveBeenCalled();
    });

    it('ignores multi-touch touchstart', () => {
      const { container, onChange } = renderSplit();
      const el = container.firstChild as HTMLElement;

      fireEvent.touchStart(el, {
        touches: [
          { clientX: 100, clientY: 0 },
          { clientX: 200, clientY: 0 },
        ],
      });
      fireEvent.touchMove(document, { touches: [{ clientX: 200, clientY: 0 }] });
      fireEvent.touchEnd(document);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores multi-touch touchmove', () => {
      const { container, onChange } = renderSplit();
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.touchStart(el, { touches: [{ clientX: 500, clientY: 0 }] });
      // multi-touch move should be ignored
      fireEvent.touchMove(document, {
        touches: [
          { clientX: 600, clientY: 0 },
          { clientX: 700, clientY: 0 },
        ],
      });
      fireEvent.touchEnd(document);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('handles column direction touch drag', () => {
      const { container, onChange, onRelease } = renderSplit({
        direction: 'column',
        percentage: 50,
      });
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.touchStart(el, { touches: [{ clientX: 0, clientY: 300 }] });
      fireEvent.touchMove(document, { touches: [{ clientX: 0, clientY: 360 }] });
      fireEvent.touchEnd(document);

      expect(onChange).toHaveBeenCalled();
      expect(onRelease).toHaveBeenCalled();
    });

    it('does nothing on touchstart when parentElement is null', () => {
      const { container, onChange } = renderSplit();
      const el = container.firstChild as HTMLElement;
      Object.defineProperty(el, 'parentElement', { get: () => null, configurable: true });

      fireEvent.touchStart(el, { touches: [{ clientX: 500, clientY: 0 }] });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('RAF batching', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('batches rapid mousemove calls via requestAnimationFrame', () => {
      let rafCallback: FrameRequestCallback | null = null;
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

      const { container, onChange } = renderSplit({ direction: 'row', percentage: 50 });
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.mouseDown(el, { clientX: 500, clientY: 0 });

      // Fire multiple moves before RAF flushes
      fireEvent.mouseMove(document, { clientX: 510, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 520, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 530, clientY: 0 });

      // onChange should not have been called yet (waiting for RAF)
      expect(onChange).not.toHaveBeenCalled();

      // Flush the RAF
      if (rafCallback) (rafCallback as FrameRequestCallback)(0);

      expect(onChange).toHaveBeenCalledOnce();

      fireEvent.mouseUp(document);
      rafSpy.mockRestore();
    });
  });

  describe('RAF cleanup', () => {
    it('cancels pending RAF on unmount', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42);

      const { container, unmount } = renderSplit({ direction: 'row', percentage: 50 });
      const el = container.firstChild as HTMLElement;

      const parent = document.createElement('div');
      Object.defineProperty(el, 'parentElement', { get: () => parent, configurable: true });
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
        width: 1000,
        height: 600,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

      fireEvent.mouseDown(el, { clientX: 500, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 550, clientY: 0 });

      // Unmount before RAF fires
      unmount();
      expect(cancelSpy).toHaveBeenCalledWith(42);
    });
  });
});
