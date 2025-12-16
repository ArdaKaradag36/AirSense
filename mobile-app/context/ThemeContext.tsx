// mobile-app/context/ThemeContext.tsx

import React, { createContext, useState, useContext, ReactNode } from 'react';

// Tema Veri Tipi
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Varsayılan FALSE = Gündüz Modu (Beyaz)
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Renk Paletleri
  const theme = {
    background: isDarkMode ? '#121212' : '#F8F9FA',
    card: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#333333',
    subText: isDarkMode ? '#AAAAAA' : '#666666',
    border: isDarkMode ? '#333333' : '#F0F0F0',
    icon: isDarkMode ? '#FFFFFF' : '#333333',
    chartBackground: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    chartLabel: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    // Logo arka planı için (Logonun kötü durmaması için)
    logoBackground: isDarkMode ? '#FFFFFF' : 'transparent',
    logoPadding: isDarkMode ? 5 : 0,
    logoRadius: isDarkMode ? 10 : 0,
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};