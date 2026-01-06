import { useRef, useCallback } from "react";

export interface UseTouchGesturesOptions {
  onZoom: (delta: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  enabled?: boolean;
}

/**
 * Hook for handling touch gestures: pinch-zoom and pan
 */
export const useTouchGestures = ({ onZoom, onPan, enabled = true }: UseTouchGesturesOptions) => {
  const touchStateRef = useRef<{
    touches: React.Touch[];
    lastDistance: number | null;
    lastPanX: number | null;
    lastPanY: number | null;
  }>({
    touches: [],
    lastDistance: null,
    lastPanX: null,
    lastPanY: null
  });

  const getDistance = useCallback((touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      e.preventDefault();
      touchStateRef.current.touches = Array.from(e.touches);
      
      if (e.touches.length === 2) {
        // Pinch gesture
        touchStateRef.current.lastDistance = getDistance(e.touches[0], e.touches[1]);
        touchStateRef.current.lastPanX = null;
        touchStateRef.current.lastPanY = null;
      } else if (e.touches.length === 1) {
        // Pan gesture
        touchStateRef.current.lastPanX = e.touches[0].clientX;
        touchStateRef.current.lastPanY = e.touches[0].clientY;
        touchStateRef.current.lastDistance = null;
      }
    },
    [enabled, getDistance]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      e.preventDefault();

      if (e.touches.length === 2) {
        // Pinch zoom
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const lastDistance = touchStateRef.current.lastDistance;

        if (lastDistance !== null && currentDistance !== lastDistance) {
          const delta = (currentDistance - lastDistance) / 100; // Scale factor
          onZoom(delta);
          touchStateRef.current.lastDistance = currentDistance;
        }
      } else if (e.touches.length === 1) {
        // Pan
        const touch = e.touches[0];
        const lastPanX = touchStateRef.current.lastPanX;
        const lastPanY = touchStateRef.current.lastPanY;

        if (lastPanX !== null && lastPanY !== null) {
          const deltaX = touch.clientX - lastPanX;
          const deltaY = touch.clientY - lastPanY;
          onPan(deltaX, deltaY);
          touchStateRef.current.lastPanX = touch.clientX;
          touchStateRef.current.lastPanY = touch.clientY;
        }
      }
    },
    [enabled, getDistance, onZoom, onPan]
  );

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current.lastDistance = null;
    touchStateRef.current.lastPanX = null;
    touchStateRef.current.lastPanY = null;
    touchStateRef.current.touches = [];
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};

