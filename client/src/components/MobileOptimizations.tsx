import { useEffect } from 'react';

export default function MobileOptimizations() {
  useEffect(() => {
    // Add mobile viewport meta tag if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
      document.head.appendChild(viewport);
    }

    // Add mobile-specific meta tags
    const metas = [
      { name: 'format-detection', content: 'telephone=no' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    ];

    metas.forEach(({ name, content }) => {
      if (!document.querySelector(`meta[name="${name}"]`)) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    });

    // Optimize body for mobile
    const body = document.body;
    (body.style as any).webkitTextSizeAdjust = '100%';
    (body.style as any).webkitFontSmoothing = 'antialiased';
    (body.style as any).mozOsxFontSmoothing = 'grayscale';
    body.style.textRendering = 'optimizeLegibility';
    (body.style as any).webkitOverflowScrolling = 'touch';
    body.style.overscrollBehavior = 'none';

    // Add mobile-specific styles
    const mobileStyles = document.createElement('style');
    mobileStyles.textContent = `
      /* Mobile optimizations */
      @media (hover: none) and (pointer: coarse) {
        button {
          min-height: 44px !important;
          min-width: 44px !important;
          touch-action: manipulation;
        }
        
        .pixel {
          transition: transform 0.1s ease !important;
        }
        
        input[type="text"],
        input[type="number"],
        textarea {
          font-size: 16px !important;
        }
        
        * {
          -webkit-overflow-scrolling: touch;
        }
      }

      /* Loading skeleton */
      .loading-skeleton {
        background: linear-gradient(90deg, hsl(215, 27%, 17%) 25%, hsl(215, 27%, 20%) 50%, hsl(215, 27%, 17%) 75%);
        background-size: 200% 100%;
        animation: loading-shimmer 2s infinite;
      }

      @keyframes loading-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      /* Connection indicator */
      .connection-status {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1000;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.75rem;
        font-weight: 500;
        transition: all 0.3s ease;
        pointer-events: none;
      }

      .connection-online {
        background: hsl(142, 69%, 58%);
        color: hsl(222, 84%, 5%);
      }

      .connection-offline {
        background: hsl(0, 84%, 60%);
        color: hsl(210, 40%, 98%);
      }
    `;
    document.head.appendChild(mobileStyles);

    return () => {
      // Cleanup if component unmounts
      document.head.removeChild(mobileStyles);
    };
  }, []);

  return null; // This component only adds meta tags and styles
}