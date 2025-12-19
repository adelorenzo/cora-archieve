import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Palette } from 'lucide-react';
import DropdownPortal from './DropdownPortal';

const ThemeSwitcher = () => {
  const { currentTheme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Calculate dropdown position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        right: window.innerWidth - rect.right + window.scrollX
      });
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Delay adding the listener to avoid catching the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleQuickToggle = () => {
    // Quick toggle between light and dark
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Quick toggle button for light/dark */}
        <button
          onClick={handleQuickToggle}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="text-xl">
            {currentTheme === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>

        {/* Theme palette button */}
        <button
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          title="Choose theme"
        >
          <Palette className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Theme dropdown */}
      {isOpen && (
        <DropdownPortal>
          <div 
            ref={dropdownRef}
            className="fixed w-48 rounded-lg bg-popover border border-border shadow-lg z-[9999]"
            style={{ 
              top: `${dropdownPosition.top + 8}px`, 
              right: `${dropdownPosition.right}px` 
            }}
          >
            <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
              Choose Theme
            </div>
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => {
                  setTheme(key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-secondary transition-colors ${
                  currentTheme === key ? 'bg-secondary' : ''
                }`}
              >
                <span className="text-lg">{theme.icon}</span>
                <span className="text-sm font-medium text-foreground">{theme.name}</span>
                {currentTheme === key && (
                  <span className="ml-auto text-xs text-foreground">✓</span>
                )}
              </button>
            ))}
          </div>
          </div>
        </DropdownPortal>
      )}
    </div>
  );
};

export default ThemeSwitcher;