import { FLAGS } from '@/config/flags';

export type ProjectNavItem = { 
  id: string; 
  name: string; 
  lastModified?: string;
};

export async function getProjectsForNav(
  take: number = FLAGS.projectsNavTake,
): Promise<ProjectNavItem[]> {
  try {
    const res = await fetch(`/api/projects?take=${take}&sort=recent`);
    if (!res.ok) throw new Error('bad status');
    const json = await res.json();
    const items = (json.items ?? json ?? []).map((p: any) => ({
      id:
        p.id ??
        p.slug ??
        String(p.name).toLowerCase().replace(/\s+/g, '-'),
      name: p.name ?? 'Untitled',
      lastModified: p.lastModified ?? p.updatedAt ?? p.createdAt,
    }));
    
    // Sort by most recent if we have timestamps
    const sorted = items.sort((a: any, b: any) => {
      if (!a.lastModified || !b.lastModified) return 0;
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });
    
    return sorted.slice(0, take);
  } catch {
    // graceful fallback demo data (sorted by most recent)
    const mockProjects = [
      { 
        id: 'q3-team-bonus', 
        name: 'Q3 Team Bonus',
        lastModified: '2024-01-15T10:30:00Z'
      },
      { 
        id: 'store-launch-gifts', 
        name: 'Store Launch Gifts',
        lastModified: '2024-01-12T14:20:00Z'
      },
      { 
        id: 'holiday-rewards', 
        name: 'Holiday Rewards',
        lastModified: '2024-01-10T09:15:00Z'
      },
      { 
        id: 'conference-prizes', 
        name: 'Conference Prizes',
        lastModified: '2024-01-08T16:45:00Z'
      },
    ];
    
    // Sort by most recent
    return mockProjects
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, take);
  }
}
