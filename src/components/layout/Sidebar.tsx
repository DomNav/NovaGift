import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import { ChevronDown, Folder, Sparkles, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ThemeLogo } from '@/components/ui/ThemeLogo';


import { orderedNav, detectPersona } from '@/config/nav';

// Dynamic navigation based on persona
const getNavigation = () => {
  const persona = detectPersona();
  return orderedNav(persona);
};

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [navigation] = useState(() => getNavigation());
  const [studioOpen, setStudioOpen] = useState(
    location.pathname.startsWith('/studio'),
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{name: string; href: string; type: 'project' | 'envelope'}>>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (
      location.pathname.startsWith('/studio') ||
      location.pathname.startsWith('/skins') ||
      location.pathname.startsWith('/kale-skins')
    ) {
      setStudioOpen(true);
    }
    // Studio dropdown opens when on any studio-related route
  }, [location.pathname]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Mock data for search - replace with actual data from your API/state
  const mockProjects = [
    { name: 'Birthday Surprise', href: '/studio/projects/1', type: 'project' as const },
    { name: 'Holiday Gift', href: '/studio/projects/2', type: 'project' as const },
    { name: 'Anniversary Special', href: '/studio/projects/3', type: 'project' as const },
  ];

  const mockEnvelopes = [
    { name: 'Welcome Envelope', href: '/studio/envelope/1', type: 'envelope' as const },
    { name: 'Thank You Card', href: '/studio/envelope/2', type: 'envelope' as const },
    { name: 'Congratulations', href: '/studio/envelope/3', type: 'envelope' as const },
  ];

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Combine and filter projects and envelopes
    const allItems = [...mockProjects, ...mockEnvelopes];
    const filtered = allItems.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    
    setSearchResults(filtered);
    setShowResults(filtered.length > 0);
    setSelectedIndex(-1);
  };

  // Perform search when debounced query changes
  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          navigate(searchResults[selectedIndex].href);
          setSearchQuery('');
          setShowResults(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSearchQuery('');
        setShowResults(false);
        searchInputRef.current?.blur();
        break;
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-container')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  return (
    <aside className="w-64 h-screen bg-brand-surface flex flex-col relative z-10 
                     shadow-[8px_0_30px_-8px_rgba(0,0,0,0.1)] dark:shadow-[8px_0_30px_-8px_rgba(0,0,0,0.4)]
                     border-r border-surface-border
                     backdrop-blur-sm
                     before:absolute before:inset-y-0 before:right-0 before:w-px 
                     before:bg-gradient-to-b before:from-transparent before:via-brand-primary/20 before:to-transparent
                     overflow-y-auto scrollbar-thin scrollbar-thumb-brand-primary/20 scrollbar-track-transparent">
      {/* Header */}
      <div className="p-4">
        <div className="mb-2">
          <ThemeLogo 
            transparentLogo="/new1-nova--gift-high-resolution-logo-transparent.png"
            size="lg"
            className="w-32 h-auto mx-auto"
          />
        </div>
        
        {/* Enhanced Search Bar */}
        <div className="mt-4 search-container relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-text/40 dark:text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search projects, envelopes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2 bg-brand-bg/50 dark:bg-gray-800/50 
                         border border-surface-border rounded-lg
                         text-brand-text dark:text-white placeholder-brand-text/40 dark:placeholder-white/40
                         focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary
                         transition-all duration-200"
            />
          </div>
          
          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-brand-surface dark:bg-gray-800 
                           border border-surface-border rounded-lg shadow-lg z-50
                           max-h-64 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.type}-${result.name}`}
                  onClick={() => {
                    navigate(result.href);
                    setSearchQuery('');
                    setShowResults(false);
                  }}
                  className={clsx(
                    'w-full text-left px-4 py-3 hover:bg-brand-bg/50 dark:hover:bg-gray-700/50 transition-colors',
                    'flex items-center gap-3 border-b border-surface-border last:border-b-0',
                    selectedIndex === index ? 'bg-brand-bg/50 dark:bg-gray-700/50' : ''
                  )}
                >
                  {result.type === 'project' ? (
                    <Folder className="h-4 w-4 text-brand-primary" />
                  ) : (
                    <span className="text-sm">📧</span>
                  )}
                  <div>
                    <div className="text-sm font-medium text-brand-text dark:text-white">
                      {result.name}
                    </div>
                    <div className="text-xs text-brand-text/60 dark:text-white/60 capitalize">
                      {result.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-1">
        <ul className="space-y-3">
          {navigation.map((item) => {
            // Handle Studio item with children differently
            if (item.id === 'studio' && item.children) {
              return (
                <li key={item.id}>
                  {/* Studio top-level row */}
                  <div
                    className={clsx(
                      'flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-300 cursor-pointer',
                      'hover:bg-white/10 dark:hover:bg-gray-800/50 hover:scale-105',
                      'hover:shadow-lg dark:hover:shadow-blue-500/20 transform',
                      location.pathname.startsWith('/studio')
                        ? 'bg-brand-primary/10 text-brand-text dark:bg-brand-primary/20'
                        : 'text-brand-text/70 dark:text-white'
                    )}
                    onClick={() => setStudioOpen(!studioOpen)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-brand-text dark:text-white">
                        {item.icon}
                      </span>
                      <span className="text-xl font-medium font-inter text-brand-primary dark:text-white">
                        {item.label}
                      </span>
                    </div>
                    <ChevronDown
                      className={clsx(
                        'h-4 w-4 transition-transform duration-300',
                        studioOpen ? 'rotate-180' : 'rotate-0'
                      )}
                    />
                  </div>
                  
                  {/* Studio sub-navigation */}
                  {studioOpen && (
                    <div className="pl-4 mt-2 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.id}
                          to={child.path || '#'}
                          className={({ isActive }) =>
                            clsx(
                              'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300',
                              'hover:bg-white/10 dark:hover:bg-gray-800/50',
                              isActive
                                ? 'bg-brand-primary/10 text-brand-text dark:bg-brand-primary/20'
                                : 'text-brand-text/70 dark:text-white'
                            )
                          }
                        >
                          <span className="text-brand-text dark:text-white">
                            {child.icon}
                          </span>
                          <span className="text-lg font-medium font-inter text-brand-primary dark:text-white">
                            {child.label}
                          </span>
                          {child.badge && (
                            <span
                              title="Coming soon (prototype)"
                              className="ml-2 inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md
                                         text-[10px] text-sky-300 bg-gradient-to-r from-sky-500/20 to-emerald-500/20
                                         ring-1 ring-sky-500/30"
                            >
                              <Sparkles className="h-3 w-3" /> {child.badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </li>
              );
            }
            
            // Regular nav items
            if (!item.path) return null;
            
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-3 py-3 rounded-lg transition-all duration-300',
                      'hover:bg-white/10 dark:hover:bg-gray-800/50 hover:scale-105',
                      'hover:shadow-lg dark:hover:shadow-blue-500/20 transform',
                      isActive
                        ? 'bg-brand-primary/10 text-brand-text dark:bg-brand-primary/20'
                        : 'text-brand-text/70 dark:text-white'
                    )
                  }
                >
                  <span className="text-brand-text dark:text-white">
                    {item.icon}
                  </span>
                  <span className="text-xl font-medium font-inter text-brand-primary dark:text-white group-hover:translate-x-1 transition-transform duration-300">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      title="Coming soon (prototype)"
                      className="ml-2 inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md
                                 text-[10px] text-sky-300 bg-gradient-to-r from-sky-500/20 to-emerald-500/20
                                 ring-1 ring-sky-500/30"
                    >
                      <Sparkles className="h-3 w-3" /> {item.badge}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-surface-border">
        <ThemeToggle />
      </div>
    </aside>
  );
};