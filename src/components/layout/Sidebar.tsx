import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import { ChevronDown, Folder, Sparkles, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import ProjectsSubnav from '@/components/nav/ProjectsSubnav';
import { FLAGS } from '@/config/flags';

const navigation = [
  { name: 'Create', href: '/', icon: '🎁' },
  { name: 'Fund', href: '/fund', icon: '💰' },
  { name: 'Open', href: '/open', icon: '📬' },
  { name: 'Activity', href: '/activity', icon: '📊' },
  { name: 'Settings', href: '/settings', icon: '🔧' },
];

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [studioOpen, setStudioOpen] = useState(
    location.pathname.startsWith('/studio'),
  );
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{name: string; href: string; type: 'project' | 'envelope'}>>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (
      location.pathname.startsWith('/studio'),
      location.pathname.startsWith('/studio/projects')
    ) {
      setStudioOpen(true);
    }
    // Projects dropdown only opens when user explicitly clicks, not based on route
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

  function ComingSoonBadge() {
    if (!FLAGS.projectsBadge) return null;
    return (
      <span
        title="Coming soon (prototype)"
        className="ml-2 inline-flex items-center gap-1 px-1.5 py-[2px] rounded-md
                   text-[10px] text-sky-300 bg-gradient-to-r from-sky-500/20 to-emerald-500/20
                   ring-1 ring-sky-500/30"
      >
        <Sparkles className="h-3 w-3" /> New
      </span>
    );
  }

  return (
    <aside className="w-64 h-screen bg-brand-surface flex flex-col border-r border-brand-text/10 dark:border-white/10">
      <div className="p-3">
        <div className="p-2 mb-1 text-center">
          {/* Custom Nova Gift Logo */}
          <div className="w-48 h-16 rounded-2xl bg-white/90 dark:bg-gray-800/90 flex items-center justify-center mx-auto shadow-lg">
            <div className="text-center">
              {/* Text Logo */}
              <h1 className="text-lg font-bold text-center">
                <span className="text-gray-800 dark:text-gray-200">Nova</span>
                <span className="mx-2 text-blue-600">•</span>
                <span className="bg-gradient-to-r from-teal-400 to-lime-400 bg-clip-text text-transparent">
                  Gift
                </span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 mb-4 search-container">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-text/40" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search projects, envelopes..."
            className="w-full pl-10 pr-4 py-2 bg-brand-surface/50 border border-brand-text/20 rounded-lg 
                     text-sm text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 
                     focus:ring-brand-primary focus:border-transparent transition-all duration-200"
          />
          
          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 
                          border border-brand-text/20 rounded-lg shadow-lg overflow-hidden z-50">
              <div className="max-h-64 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.type}-${index}`}
                    onClick={() => {
                      navigate(result.href);
                      setSearchQuery('');
                      setShowResults(false);
                    }}
                    className={clsx(
                      'w-full px-4 py-2 text-left hover:bg-brand-primary/10 transition-colors',
                      'flex items-center gap-2 text-sm',
                      selectedIndex === index && 'bg-brand-primary/20'
                    )}
                  >
                    <span className="text-xs">
                      {result.type === 'project' ? '📁' : '✉️'}
                    </span>
                    <span className="flex-1 text-brand-text dark:text-white">
                      {result.name}
                    </span>
                    <span className="text-xs text-brand-text/60 dark:text-white/60">
                      {result.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* No Results Message */}
          {showResults && searchQuery && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 
                          border border-brand-text/20 rounded-lg shadow-lg p-3 z-50">
              <p className="text-sm text-brand-text/60 dark:text-white/60 text-center">
                No results found for "{searchQuery}"
              </p>
            </div>
          )}
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
                      ? 'bg-brand-primary/10 text-brand-text dark:bg-brand-primary/20'
                      : 'text-brand-text/70 dark:text-white'
                  )
                }
              >
                <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                  {item.icon}
                </span>
                <span className="text-xl font-medium font-inter text-brand-primary dark:text-white group-hover:translate-x-1 transition-transform duration-300">
                  {item.name}
                </span>
              </NavLink>
            </li>
          ))}
          
          {/* === STUDIO GROUP ==================================================== */}
          <li>
            {/* Studio top-level row */}
            <div className="flex items-center w-full">
              <NavLink
                to="/studio"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-3 rounded-lg transition-all duration-300 flex-1',
                    'hover:bg-white/10 dark:hover:bg-gray-800/50 hover:scale-105',
                    'hover:shadow-lg dark:hover:shadow-blue-500/20 transform',
                    isActive
                      ? 'bg-brand-primary/10 text-brand-text dark:bg-brand-primary/20'
                      : 'text-brand-text/70 dark:text-white'
                  )
                }
              >
                <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                  🎨
                </span>
                <span className="flex-1 text-left text-xl font-medium font-inter text-brand-primary dark:text-white group-hover:translate-x-1 transition-transform duration-300">
                  Studio
                </span>
              </NavLink>
              <button
                type="button"
                onClick={() => setStudioOpen((v) => !v)}
                className="p-2 hover:bg-white/10 rounded-md transition-all duration-300 text-brand-text/70 dark:text-white"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    studioOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Studio content */}
            <div
              className={`mt-1 overflow-hidden transition-[max-height] duration-300 ${
                studioOpen ? 'max-h-96' : 'max-h-0'
              }`}
            >
              {/* Projects row (expandable only) */}
              <div className="pl-8 pr-2">
                <button
                  type="button"
                  onClick={() => setProjectsOpen((v) => !v)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md
                             text-brand-text/70 dark:text-white hover:text-brand-text dark:hover:text-white hover:bg-white/10 dark:hover:bg-gray-800/50 transition-all duration-300"
                >
                  <Folder className="h-4 w-4" />
                  <span className="flex-1 text-left">Projects</span>
                  <ComingSoonBadge />
                  <ChevronDown
                    className={`ml-1 h-4 w-4 transition-transform ${
                      projectsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Sub-items */}
              <div
                className={`transition-[max-height] duration-300 ${
                  projectsOpen ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <ProjectsSubnav />
              </div>
            </div>
          </li>
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="p-2 flex justify-center">
        <ThemeToggle />
      </div>

      <div className="p-2">
        <div className="text-center">
          <p className="text-xs text-brand-text/60">Version 0.1.0</p>
        </div>
      </div>
    </aside>
  );
};
