import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { ThemeLogo } from '@/components/ui/ThemeLogo'

const navigation = [
  { name: 'Create', href: '/', icon: '🎁' },
  { name: 'Fund', href: '/fund', icon: '💰' },
  { name: 'Open', href: '/open', icon: '📬' },
  { name: 'Activity', href: '/activity', icon: '📊' },
  { name: 'Studio', href: '/studio', icon: '🎨' },
  { name: 'Settings', href: '/settings', icon: '🔧' },
]

export const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-brand-surface flex flex-col border-r border-brand-text/10 dark:border-white/10">
      <div className="p-3">
        <div className="p-2 mb-1 text-center">
          <div className="w-48 h-48 rounded-full bg-brand-surface/80 dark:bg-brand-surface/60 flex items-center justify-center mx-auto">
            <ThemeLogo size="lg" className="w-40 h-40" />
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-1">
        <ul className="space-y-3">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-3 rounded-lg transition-all duration-300',
                    'hover:bg-white/10 dark:hover:bg-gray-800/50 hover:scale-105',
                    'hover:shadow-lg dark:hover:shadow-blue-500/20 transform',
                    isActive
                      ? 'bg-brand-primary/20 text-brand-text scale-105 shadow-lg shadow-purple-400/30 dark:bg-brand-primary/30'
                      : 'text-brand-text/70 dark:text-white',
                  )
                }
              >
                <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                  {item.icon}
                </span>
                <span className="text-xl font-medium font-inter text-brand-primary dark:text-white group-hover:translate-x-1 transition-transform duration-300">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-2">
        <div className="text-center">
          <p className="text-xs text-brand-text/60">Version 0.1.0</p>
        </div>
      </div>
    </aside>
  )
}