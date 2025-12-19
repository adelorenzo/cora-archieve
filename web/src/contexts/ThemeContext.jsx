import React, { createContext, useContext, useState, useEffect } from 'react';
import settingsService from '../lib/settings-service';

const themes = {
  light: {
    name: 'Light',
    class: 'light',
    icon: '☀️'
  },
  dark: {
    name: 'Dark', 
    class: 'dark',
    icon: '🌙'
  },
  ocean: {
    name: 'Ocean',
    class: 'ocean',
    icon: '🌊'
  },
  forest: {
    name: 'Forest',
    class: 'forest',
    icon: '🌲'
  },
  sunset: {
    name: 'Sunset',
    class: 'sunset',
    icon: '🌅'
  },
  midnight: {
    name: 'Midnight',
    class: 'midnight',
    icon: '🌌'
  },
  rose: {
    name: 'Rose',
    class: 'rose',
    icon: '🌹'
  },
  monochrome: {
    name: 'Monochrome',
    class: 'monochrome',
    icon: '⚫'
  }
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return settingsService.getTheme();
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    Object.values(themes).forEach(theme => {
      root.classList.remove(theme.class);
    });
    
    // Add current theme class
    root.classList.add(themes[currentTheme].class);
    
    // Save to settings service
    settingsService.setTheme(currentTheme);
  }, [currentTheme]);

  const value = {
    currentTheme,
    setTheme: setCurrentTheme,
    themes,
    currentThemeData: themes[currentTheme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};