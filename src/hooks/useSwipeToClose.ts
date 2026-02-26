import { useRef, useCallback, useState } from 'react';

interface UseSwipeToCloseOptions {
  onClose: () => void;
  direction?: 'right' | 'left';
  threshold?: number;
  maxSwipe?: number;
  /** Width of the panel in pixels (used for opacity calculation). Defaults to window.innerWidth */
  panelWidth?: number;
}

interface SwipeState {
  translateX: number;
  isAnimatingBack: boolean;
  isSwiping: boolean;
  progress: number; // 0 to 1
}

export function useSwipeToClose({
  onClose,
  direction = 'right',
  threshold = 80,
  maxSwipe,
  panelWidth,
}: UseSwipeToCloseOptions) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isTrackingRef = useRef(false);
  const isLockedRef = useRef(false); // locked to horizontal once determined
  const [swipeState, setSwipeState] = useState<SwipeState>({
    translateX: 0,
    isAnimatingBack: false,
    isSwiping: false,
    progress: 0,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't interfere with scrollable content
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    isTrackingRef.current = true;
    isLockedRef.current = false;
    setSwipeState({ translateX: 0, isAnimatingBack: false, isSwiping: false, progress: 0 });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !isTrackingRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine direction lock on first significant movement
    if (!isLockedRef.current) {
      if (absDeltaX < 10 && absDeltaY < 10) return; // Not enough movement yet
      
      // If vertical movement is dominant, stop tracking (user is scrolling)
      if (absDeltaY > absDeltaX * 1.2) {
        isTrackingRef.current = false;
        return;
      }
      
      // Lock to horizontal
      isLockedRef.current = true;
    }

    // Calculate effective swipe distance based on direction
    let swipeDistance: number;
    if (direction === 'right') {
      swipeDistance = Math.max(0, deltaX); // Only allow positive (rightward) swipe
    } else {
      swipeDistance = Math.max(0, -deltaX); // Only allow leftward swipe
    }

    // Apply resistance after threshold
    if (swipeDistance > threshold) {
      const excess = swipeDistance - threshold;
      swipeDistance = threshold + excess * 0.4; // Rubber band effect
    }

    // Cap at maxSwipe if provided
    const effectiveMax = maxSwipe || window.innerWidth;
    swipeDistance = Math.min(swipeDistance, effectiveMax);

    const effectivePanelWidth = panelWidth || window.innerWidth;
    const progress = Math.min(swipeDistance / effectivePanelWidth, 1);

    // Prevent vertical scroll while swiping horizontally
    if (swipeDistance > 10) {
      e.preventDefault();
    }

    setSwipeState({
      translateX: direction === 'right' ? swipeDistance : -swipeDistance,
      isAnimatingBack: false,
      isSwiping: true,
      progress,
    });
  }, [direction, threshold, maxSwipe, panelWidth]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current || !isLockedRef.current) {
      touchStartRef.current = null;
      isTrackingRef.current = false;
      isLockedRef.current = false;
      setSwipeState({ translateX: 0, isAnimatingBack: false, isSwiping: false, progress: 0 });
      return;
    }

    const currentTranslate = Math.abs(swipeState.translateX);
    const elapsed = Date.now() - (touchStartRef.current?.time || 0);
    
    // Check velocity - fast swipes should also trigger close
    const velocity = currentTranslate / Math.max(elapsed, 1); // px/ms
    const shouldClose = currentTranslate >= threshold || (velocity > 0.5 && currentTranslate > 30);

    if (shouldClose) {
      // Animate out to full width then close
      const fullWidth = panelWidth || window.innerWidth;
      setSwipeState({
        translateX: direction === 'right' ? fullWidth : -fullWidth,
        isAnimatingBack: true, // use transition
        isSwiping: false,
        progress: 1,
      });
      // Delay close to allow animation
      setTimeout(() => {
        onClose();
        setSwipeState({ translateX: 0, isAnimatingBack: false, isSwiping: false, progress: 0 });
      }, 250);
    } else {
      // Snap back
      setSwipeState({
        translateX: 0,
        isAnimatingBack: true,
        isSwiping: false,
        progress: 0,
      });
      // Clear animating state after transition
      setTimeout(() => {
        setSwipeState(prev => ({ ...prev, isAnimatingBack: false }));
      }, 300);
    }

    touchStartRef.current = null;
    isTrackingRef.current = false;
    isLockedRef.current = false;
  }, [swipeState.translateX, threshold, direction, panelWidth, onClose]);

  // Styles to apply to the panel
  const panelStyle: React.CSSProperties = {
    transform: swipeState.translateX !== 0 ? `translateX(${swipeState.translateX}px)` : undefined,
    transition: swipeState.isAnimatingBack
      ? 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
      : swipeState.isSwiping
      ? 'none'
      : undefined,
    willChange: swipeState.isSwiping ? 'transform' : undefined,
  };

  // Backdrop opacity style (fades as panel is swiped away)
  const backdropStyle: React.CSSProperties = {
    opacity: swipeState.isSwiping || swipeState.isAnimatingBack
      ? Math.max(0, 1 - swipeState.progress * 1.5)
      : undefined,
    transition: swipeState.isAnimatingBack
      ? 'opacity 0.25s ease-out'
      : swipeState.isSwiping
      ? 'none'
      : undefined,
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    panelStyle,
    backdropStyle,
    isSwiping: swipeState.isSwiping,
    swipeProgress: swipeState.progress,
  };
}
