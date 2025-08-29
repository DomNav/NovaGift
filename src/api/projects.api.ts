export type Stats = { opened: number; pending: number; expired: number };
export type ProjectRow = {
  id: string;
  name: string;
  recipientsCount: number;
  asset: string;
  budget: number;
  schedule: { issueAt: string; expiresAt?: string };
  status: 'draft' | 'funded' | 'issued' | 'expired';
  stats: Stats;
};
export type Recipient = {
  id: string;
  name: string;
  amount: number;
  asset: string;
  channel: 'email' | 'qr' | null;
  status: 'draft' | 'issued' | 'opened' | 'expired';
};
export type ProjectDetail = ProjectRow & { recipients: Recipient[] };

/*
 * Fetch the list of projects for the current user.
 * Falls back to mock data when the backend route is unavailable so the UI
 * remains functional during development.
 */
export async function fetchProjects(): Promise<ProjectRow[]> {
  try {
    const r = await fetch('/api/projects');
    if (!r.ok) throw new Error('fetchProjects: bad status');
    const j = await r.json();
    return j.projects as ProjectRow[];
  } catch (err) {
    /* eslint-disable no-console */
    console.warn('[projects.api] fetchProjects fallback', err);
    /* eslint-enable no-console */
    // Provide deterministic mock data
    const now = new Date().toISOString().slice(0, 10);
    return [
      {
        id: 'q3-bonus',
        name: 'Q3 Team Bonus',
        recipientsCount: 42,
        asset: 'USDC',
        budget: 12_500,
        schedule: { issueAt: now },
        status: 'issued',
        stats: { opened: 82, pending: 15, expired: 3 },
      },
      {
        id: 'store-launch',
        name: 'Store Launch Gifts',
        recipientsCount: 120,
        asset: 'XLM',
        budget: 50_000,
        schedule: { issueAt: now },
        status: 'funded',
        stats: { opened: 0, pending: 100, expired: 0 },
      },
    ];
  }
}

/*
 * Fetch detailed information for a single project.
 */
export async function fetchProject(id: string): Promise<ProjectDetail> {
  try {
    const r = await fetch(`/api/projects/${id}`);
    if (!r.ok) throw new Error('fetchProject: bad status');
    const j = await r.json();
    return j.project as ProjectDetail;
  } catch (err) {
    console.warn('[projects.api] fetchProject fallback', err);
    // Provide a mock detail object matching the list fallback
    const base = {
      id,
      name: 'Mock Project',
      recipientsCount: 3,
      asset: 'USDC',
      budget: 300,
      schedule: { issueAt: new Date().toISOString().slice(0, 10) },
      status: 'draft' as const,
      stats: { opened: 33, pending: 67, expired: 0 },
    } satisfies ProjectRow;
    return {
      ...base,
      recipients: [
        {
          id: 'r1',
          name: 'Alice Example',
          amount: 100,
          asset: 'USDC',
          channel: 'email',
          status: 'opened',
        },
        {
          id: 'r2',
          name: 'Bob Example',
          amount: 100,
          asset: 'USDC',
          channel: 'email',
          status: 'issued',
        },
        {
          id: 'r3',
          name: 'Charlie Example',
          amount: 100,
          asset: 'USDC',
          channel: 'email',
          status: 'issued',
        },
      ],
    } satisfies ProjectDetail;
  }
}
