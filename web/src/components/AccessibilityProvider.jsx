import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * Accessibility Context Provider
 * Manages keyboard navigation, screen reader announcements, and focus management
 */
const AccessibilityContext = createContext();

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [announcement, setAnnouncement] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Detect user preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);

    const handleChange = (e) => setReduceMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrastMode(mediaQuery.matches);

    const handleChange = (e) => setHighContrastMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip to main content
      if (e.key === '1' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const main = document.querySelector('main, [role="main"]');
        if (main) {
          main.tabIndex = -1;
          main.focus();
          announce('Jumped to main content');
        }
      }

      // Toggle focus mode
      if (e.key === 'F6') {
        setFocusMode(prev => !prev);
        announce(focusMode ? 'Focus mode disabled' : 'Focus mode enabled');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode]);

  // Screen reader announcement
  const announce = (message, priority = 'polite') => {
    setAnnouncement('');
    setTimeout(() => {
      setAnnouncement(message);
    }, 100);
  };

  // Focus trap management
  const trapFocus = (containerRef) => {
    if (!containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    containerRef.current.addEventListener('keydown', handleTabKey);
    return () => containerRef.current?.removeEventListener('keydown', handleTabKey);
  };

  const value = {
    announce,
    focusMode,
    highContrastMode,
    reduceMotion,
    trapFocus
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </AccessibilityContext.Provider>
  );
};

/**
 * Skip to content link component
 */
export const SkipToContent = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
};

/**
 * Focus indicator wrapper
 */
export const FocusIndicator = ({ children, className = '' }) => {
  return (
    <div className={`focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 rounded-lg ${className}`}>
      {children}
    </div>
  );
};

/**
 * Accessible Icon Button
 */
export const AccessibleButton = ({
  icon,
  label,
  onClick,
  className = '',
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center p-2 rounded-lg hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
      {...props}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
};

/**
 * Live Region for dynamic updates
 */
export const LiveRegion = ({ message, priority = 'polite' }) => {
  return (
    <div
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

export default AccessibilityProvider;