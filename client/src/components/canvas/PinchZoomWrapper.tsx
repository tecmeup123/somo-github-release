import { memo, useRef, useCallback, useEffect } from 'react';

interface PinchZoomWrapperProps {
  children: React.ReactNode;
  className?: string;
}

function PinchZoomWrapper({ children, className }: PinchZoomWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number>(0);
  const currentScale = useRef<number>(1);
  const lastCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTranslate = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches: TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const updateTransform = useCallback(() => {
    if (!contentRef.current) return;
    
    const scale = Math.max(0.5, Math.min(4, currentScale.current));
    const translateX = lastTranslate.current.x;
    const translateY = lastTranslate.current.y;
    
    contentRef.current.style.transform = 
      `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    contentRef.current.style.transformOrigin = 'center center';
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouchDistance.current = getTouchDistance(e.touches);
      lastCenter.current = getTouchCenter(e.touches);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      
      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      
      if (lastTouchDistance.current > 0) {
        // Handle zoom
        const scaleChange = currentDistance / lastTouchDistance.current;
        currentScale.current *= scaleChange;
        
        // Handle pan
        const deltaX = currentCenter.x - lastCenter.current.x;
        const deltaY = currentCenter.y - lastCenter.current.y;
        lastTranslate.current.x += deltaX;
        lastTranslate.current.y += deltaY;
        
        updateTransform();
      }
      
      lastTouchDistance.current = currentDistance;
      lastCenter.current = currentCenter;
    }
  }, [updateTransform]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = 0;
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Double tap to reset
    currentScale.current = 1;
    lastTranslate.current = { x: 0, y: 0 };
    updateTransform();
  }, [updateTransform]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('dblclick', handleDoubleClick);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleDoubleClick]);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ 
        touchAction: 'none',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div 
        ref={contentRef}
        style={{
          transition: 'transform 0.1s ease-out',
          transformOrigin: 'center center'
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when props haven't changed
export default memo(PinchZoomWrapper);