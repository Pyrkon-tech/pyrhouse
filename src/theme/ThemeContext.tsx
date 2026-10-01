import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createThemeWithMode } from '@pyrhouse/ui';
import { useStorage } from '../hooks/useStorage';

// Typy dla trybu motywu
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  themeMode: 'light',
  setThemeMode: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const useThemeMode = () => {
  const { isDarkMode, toggleTheme, themeMode, setThemeMode } = useThemeContext();
  return { themeMode, setThemeMode, toggleTheme, isDarkMode };
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { getThemeMode, setThemeMode: setStorageThemeMode } = useStorage();
  
  // Stan dla trybu motywu (light, dark, system)
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const savedMode = getThemeMode() as ThemeMode;
    return savedMode || 'light';
  });
  
  // Stan dla aktualnego motywu (true = dark, false = light)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (themeMode === 'dark') {
      return true;
    } else if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      return false;
    }
  });
  
  // Funkcja do ustawiania trybu motywu
  const setThemeMode = (mode: ThemeMode) => {
    // Zapisz tryb w storage
    setStorageThemeMode(mode);
    
    // Zaktualizuj stan trybu
    setThemeModeState(mode);
    
    // Zaktualizuj stan ciemnego motywu
    if (mode === 'dark') {
      setIsDarkMode(true);
    } else if (mode === 'light') {
      setIsDarkMode(false);
    } else if (mode === 'system') {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  };
  
  // Funkcja do przełączania między jasnym a ciemnym
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };
  
  // Nasłuchiwanie zmian preferencji systemowych
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (themeMode === 'system') {
        setIsDarkMode(mediaQuery.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);
  
  // Tworzenie motywu
  const theme = useMemo(() => createThemeWithMode(isDarkMode ? 'dark' : 'light'), [isDarkMode]);
  
  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, themeMode, setThemeMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}; 