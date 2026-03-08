// ============================================================
// FILE: ScrollToTop.tsx
// SECTION: shared > components
// PURPOSE: Route change hone par page top par scroll karna.
//          React Router ke saath use hota hai.
// ============================================================
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
