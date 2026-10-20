// components/ui/ThemeToggle.jsx
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Botón para alternar entre modo claro y oscuro.
 * @param {Object} props
 * @param {'sm' | 'md'} [props.size='md']
 */
export const ThemeToggle = ({ size = 'md' }) => {
  const { efectivo, toggle } = useTheme();

  const dims = size === 'sm'
    ? 'h-8 w-8'
    : 'h-10 w-10';

  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={efectivo === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={efectivo === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      className={`grid ${dims} place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white`}
    >
      {efectivo === 'dark' ? (
        <Sun size={iconSize} />
      ) : (
        <Moon size={iconSize} />
      )}
    </button>
  );
};