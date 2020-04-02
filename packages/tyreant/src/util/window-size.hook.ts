import { useState, useEffect } from 'react';

export const useWindowSize = (): { width: number; height: number } => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onResize = () =>
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
  });

  return windowSize;
};
