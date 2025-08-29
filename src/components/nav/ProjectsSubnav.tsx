import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { getProjectsForNav } from '@/lib/api/projects';
import { FLAGS } from '@/config/flags';

export default function ProjectsSubnav() {
  const { data } = useQuery({
    queryKey: ['projects', 'nav'],
    queryFn: () => getProjectsForNav(FLAGS.projectsNavTake),
    staleTime: 30_000,
  });

  const items = data ?? [];
  const location = useLocation();

  return (
    <div className="pl-9 pr-2 pb-2 space-y-1">
      {items.map((p) => {
        const active = location.pathname.startsWith(`/projects/${p.id}`);
        return (
          <Link
            key={p.id}
            to={`/studio/projects/${p.id}`}
            className={`block text-sm px-2 py-1.5 rounded-md hover:bg-white/10 dark:hover:bg-gray-800/50
            ${active ? 'text-brand-text dark:text-white bg-white/10 dark:bg-gray-800/50' : 'text-brand-text/70 dark:text-white hover:text-brand-text dark:hover:text-white'}`}
          >
            {p.name}
          </Link>
        );
      })}
      <Link
        to="/studio/projects"
        className={`block text-xs px-2 py-1.5 rounded-md hover:bg-white/10 dark:hover:bg-gray-800/50 ${
          location.pathname === '/studio/projects'
            ? 'text-brand-text dark:text-white bg-white/10 dark:bg-gray-800/50'
            : 'text-brand-text/70 dark:text-white hover:text-brand-text dark:hover:text-white'
        }`}
      >
        View all →
      </Link>
    </div>
  );
}
