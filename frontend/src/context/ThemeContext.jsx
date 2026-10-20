// context/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const STORAGE_KEY = 'theme'; // 'light' | 'dark' | 'system'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const aplicarTema = (tema) => {
  const root = document.documentElement;
  const efectivo = tema === 'system' ? getSystemTheme() : tema;
  if (efectivo === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const ThemeProvider = ({ children }) => {
  // Tema elegido por el usuario: 'light' | 'dark' | 'system'
  const [tema, setTema] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'system'
  );

  // Tema efectivo (resuelto): 'light' | 'dark'
  const [efectivo, setEfectivo] = useState(() =>
    tema === 'system' ? getSystemTheme() : tema
  );

  // Aplicar el tema cuando cambia
  useEffect(() => {
    aplicarTema(tema);
    setEfectivo(tema === 'system' ? getSystemTheme() : tema);
    localStorage.setItem(STORAGE_KEY, tema);
  }, [tema]);

  // Escuchar cambios del sistema operativo (si el tema es "system")
  useEffect(() => {
    if (tema !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      aplicarTema('system');
      setEfectivo(getSystemTheme());
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [tema]);

  // Toggle simple: light ↔ dark (ignora "system")
  const toggle = () => {
    setTema((t) => {
      const actual = t === 'system' ? getSystemTheme() : t;
      return actual === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ tema, efectivo, setTema, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
};