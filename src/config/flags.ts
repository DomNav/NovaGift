export const FLAGS = {
  // whether to show the tiny "New" badge
  projectsBadge:
    (import.meta.env.VITE_SHOW_PROJECTS_BADGE ?? 'true') === 'true',

  // how many project names to fetch for the sidebar sub-nav
  projectsNavTake: Number(import.meta.env.VITE_PROJECTS_NAV_TAKE ?? '5'),
};
