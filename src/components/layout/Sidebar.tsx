import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { ThemeLogo } from '@/components/ui/ThemeLogo'

const navigation = [
  { name: 'Create', href: '/', icon: '✉' },
  { name: 'Fund', href: '/fund', icon: '💰' },
  { name: 'Open', href: '/open', icon: '📬' },
  { name: 'Activity', href: '/activity', icon: '📊' },
  { name: 'Studio', href: '/studio', icon: '🎨' },
  { name: 'Settings', href: '/settings', icon: '⚙' },
]

export const Sidebar = () => {
  return (
    <aside className="w-64 h-screen bg-brand-surface border-r border-brand-text/10 dark:border-white/10 flex flex-col">
      <div className="p-6 border-b border-brand-text/10 dark:border-white/10">
        <div className="logo-banner relative overflow-hidden rounded-xl p-4 mb-2 text-center">
          <div className="relative z-10 space-y-3">
            <ThemeLogo size="md" />
          </div>
          <div className="banner-glow absolute inset-0 opacity-60"></div>
          <div className="banner-shine absolute inset-0 opacity-30"></div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                    'hover:bg-white/5 group',
                    isActive
                      ? 'bg-brand-primary/20 text-brand-text'
                      : 'text-brand-text/70',
                  )
                }
              >
                <span className="text-xl group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-medium">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-brand-text/10 dark:border-white/10">
        <div className="text-center">
          <p className="text-xs text-brand-text/60">Version 0.1.0</p>
        </div>
      </div>
    </aside>
  )
}