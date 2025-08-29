export type Stats = { opened: number; pending: number; expired: number };

export type ProjectKind = 'STANDARD' | 'QR_EVENT';
export type ProjectStatus = 'DRAFT' | 'FUNDED' | 'ACTIVE' | 'ENDED';
export type QrEventType = 'POOL' | 'ASSIGNED' | 'CHECKIN';

export type ProjectRow = {
  id: string;
  name: string;
  kind: ProjectKind;
  recipientsCount: number;
  assetCode: string;
  budget: number;
  schedule: { issueAt: string; expiresAt?: string };
  status: ProjectStatus;
  stats: Stats;
};

export type QrCode = {
  id: string;
  code: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  assignedContact?: string;
  claimedAt?: string;
};

export type QrEvent = {
  id: string;
  startAt: string;
  endAt: string;
  eventType: QrEventType;
  poolSize: number;
  amount: string;
  generated: number;
  redeemed: number;
  codes: QrCode[];
};

export type Recipient = {
  id: string;
  name: string;
  amount: number;
  asset: string;
  channel: 'email' | 'qr' | null;
  status: 'draft' | 'issued' | 'opened' | 'expired';
};

export type ProjectDetail = ProjectRow & { 
  recipients: Recipient[];
  qrEvent?: QrEvent;
};

/*
 * Fetch the list of projects for the current user.
 * Falls back to mock data when the backend route is unavailable so the UI
 * remains functional during development.
 */
export async function fetchProjects(): Promise<ProjectRow[]> {
  try {
    const r = await fetch('/api/qr/projects');
    if (!r.ok) throw new Error('fetchProjects: bad status');
    const j = await r.json();
    return j.projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      recipientsCount: p.qrEvent?.codes?.length || 0,
      assetCode: p.assetCode,
      budget: parseFloat(p.budget),
      schedule: { 
        issueAt: p.qrEvent?.startAt ? new Date(p.qrEvent.startAt).toISOString().slice(0, 10) : 'Not scheduled',
        expiresAt: p.qrEvent?.endAt ? new Date(p.qrEvent.endAt).toISOString().slice(0, 10) : undefined
      },
      status: p.status,
      stats: {
        opened: p.qrEvent?.redeemed || 0,
        pending: (p.qrEvent?.generated || 0) - (p.qrEvent?.redeemed || 0),
        expired: 0 // TODO: calculate based on expiry dates
      },
    })) as ProjectRow[];
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
        kind: 'STANDARD',
        recipientsCount: 42,
        assetCode: 'USDC',
        budget: 12_500,
        schedule: { issueAt: now },
        status: 'ACTIVE',
        stats: { opened: 82, pending: 15, expired: 3 },
      },
      {
        id: 'store-launch',
        name: 'Store Launch Gifts',
        kind: 'QR_EVENT',
        recipientsCount: 120,
        assetCode: 'XLM',
        budget: 50_000,
        schedule: { issueAt: now },
        status: 'FUNDED',
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
    const r = await fetch(`/api/qr/projects/${id}`);
    if (!r.ok) throw new Error('fetchProject: bad status');
    const j = await r.json();
    const p = j.project;
    
    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      recipientsCount: p.qrEvent?.codes?.length || 0,
      assetCode: p.assetCode,
      budget: parseFloat(p.budget),
      schedule: { 
        issueAt: p.qrEvent?.startAt ? new Date(p.qrEvent.startAt).toISOString().slice(0, 10) : 'Not scheduled',
        expiresAt: p.qrEvent?.endAt ? new Date(p.qrEvent.endAt).toISOString().slice(0, 10) : undefined
      },
      status: p.status,
      stats: {
        opened: p.qrEvent?.redeemed || 0,
        pending: (p.qrEvent?.generated || 0) - (p.qrEvent?.redeemed || 0),
        expired: 0
      },
      recipients: [], // QR Events don't use traditional recipients
      qrEvent: p.qrEvent ? {
        id: p.qrEvent.id,
        startAt: p.qrEvent.startAt,
        endAt: p.qrEvent.endAt,
        eventType: p.qrEvent.eventType,
        poolSize: p.qrEvent.poolSize,
        amount: (parseFloat(p.qrEvent.amountAtomic) / 10000000).toString(), // Convert from atomic
        generated: p.qrEvent.generated,
        redeemed: p.qrEvent.redeemed,
        codes: p.qrEvent.codes || []
      } : undefined
    };
  } catch (err) {
    console.warn('[projects.api] fetchProject fallback', err);
    // Provide a mock detail object matching the list fallback
    const base = {
      id,
      name: 'Mock QR Event',
      kind: 'QR_EVENT' as ProjectKind,
      recipientsCount: 100,
      assetCode: 'USDC',
      budget: 2500,
      schedule: { issueAt: new Date().toISOString().slice(0, 10) },
      status: 'DRAFT' as ProjectStatus,
      stats: { opened: 25, pending: 75, expired: 0 },
    } satisfies ProjectRow;
    return {
      ...base,
      recipients: [],
      qrEvent: {
        id: 'mock-event',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        eventType: 'POOL',
        poolSize: 100,
        amount: '25',
        generated: 100,
        redeemed: 25,
        codes: Array.from({ length: 5 }, (_, i) => ({
          id: `code-${i}`,
          code: `ABC${i.toString().padStart(3, '0')}XY`,
          status: i < 2 ? 'USED' as const : 'ACTIVE' as const,
          claimedAt: i < 2 ? new Date().toISOString() : undefined
        }))
      }
    } satisfies ProjectDetail;
  }
}
