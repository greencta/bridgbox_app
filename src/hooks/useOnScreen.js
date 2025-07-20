import { useState, useEffect } from 'react';

/**
 * A custom React Hook to determine if an element is currently visible in the viewport.
 * @param {React.RefObject} ref - A ref attached to the element to observe.
 * @returns {boolean} - True if the element is on screen, false otherwise.
 */
export default function useOnScreen(ref) {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIntersecting(entry.isIntersecting)
    );

    const currentRef = ref.current;

    if (currentRef) {
      observer.observe(currentRef);
    }
    
    // Clean up the observer when the component unmounts
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref]);

  return isIntersecting;
}