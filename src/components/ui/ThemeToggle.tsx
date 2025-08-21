import { useTheme } from '@/contexts/ThemeContext'
import clsx from 'clsx'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        'relative w-14 h-7 rounded-full transition-colors duration-300',
        'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2',
        'focus:ring-offset-brand-bg',
        theme === 'dark' ? 'bg-brand-primary' : 'bg-gray-300'
      )}
      aria-label="Toggle theme"
    >
      <div
        className={clsx(
          'absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-300',
          'flex items-center justify-center text-xs',
          theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
        )}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </div>
    </button>
  )
}