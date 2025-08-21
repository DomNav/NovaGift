import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

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
        <h1 className="text-2xl font-antonio gradient-text">SoroSeal</h1>
        <p className="text-xs text-brand-text/60 mt-1">Seal now, open true.</p>
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
                      ? 'bg-brand-primary/20 text-brand-text border-l-2 border-brand-primary'
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
        <div className="glass-card p-3 text-center space-y-3">
          <img 
            src="/logo.png" 
            alt="SoroSeal Logo" 
            className="w-16 h-16 mx-auto opacity-70 hover:opacity-100 transition-opacity duration-200"
          />
          <p className="text-xs text-brand-text/60">Version 0.1.0</p>
        </div>
      </div>
    </aside>
  )
}