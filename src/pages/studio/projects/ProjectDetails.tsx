import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProject, type Recipient } from '@/api/projects.api';
import ProgressGraph from '@/components/studio/ProgressGraph';
import { EventPoster } from '@/components/qr/EventPoster';
import { QrPackTable } from '@/components/qr/QrPackTable';
import { PageHeader } from '@/components/PageHeader';

const chip = (label: string, cls: string) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>
);

const statusChip = (s: Recipient['status']) => {
  const map: Record<Recipient['status'], string> = {
    draft: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
    issued: 'bg-indigo-200 text-indigo-900 dark:bg-indigo-700 dark:text-white',
    opened: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700 dark:text-white',
    expired: 'bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-white',
  };
  return chip(s[0].toUpperCase() + s.slice(1), map[s]);
};

export default function ProjectDetails() {
  const { id = '' } = useParams();
  const { data, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => fetchProject(id) });

  if (isLoading || !data) return <div className="p-6 text-slate-500">Loading…</div>;
  const p = data;

  const breadcrumbs = [
    { label: 'Studio', href: '/studio' },
    { label: 'Projects', href: '/studio/projects' },
    { label: p.name }
  ];

  // Handle QR Event projects differently
  if (p.kind === 'QR_EVENT') {
    const steps = ['Draft', 'Funded', 'Active', 'Ended'];
    const idx = steps.findIndex((s) => s.toLowerCase() === p.status.toLowerCase());
    
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title={p.name}
          description={`${p.kind === 'QR_EVENT' ? 'QR Event' : 'Standard'} Project • ${p.assetCode} • ${p.status}`}
          breadcrumbs={breadcrumbs}
          showBackButton={true}
          backLabel="Back to Projects"
        />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4">
            <div className="text-sm text-slate-500">BUDGET / ASSET</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {p.assetCode === 'USDC' ? `$${p.budget.toLocaleString()}` : `${p.budget} ${p.assetCode}`}
            </div>
            <div className="text-sm mt-1">{p.assetCode}</div>
            <div className="text-xs text-slate-500 mt-2">
              {p.qrEvent?.amount} {p.assetCode} per claim
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4">
            <div className="text-sm text-slate-500">EVENT SCHEDULE</div>
            <div className="mt-2 leading-6">
              <div>
                Starts: <span className="font-medium">{p.schedule.issueAt}</span>
              </div>
              {p.schedule.expiresAt && (
                <div>
                  Ends: <span className="font-medium">{p.schedule.expiresAt}</span>
                </div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                Event Type: {p.qrEvent?.eventType}
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <ProgressGraph 
              stats={p.stats} 
              totalRecipients={p.qrEvent?.poolSize || 0}
            />
          </div>
        </div>

        {/* QR Event specific content */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8">
            {p.qrEvent && (
              <QrPackTable 
                codes={p.qrEvent.codes}
                onGenerateMore={() => console.log('Generate more codes')}
                onExportCsv={() => console.log('Export CSV')}
              />
            )}
          </div>
          <div className="col-span-12 lg:col-span-4">
            {p.qrEvent && (
              <EventPoster 
                event={{...p.qrEvent, name: p.name, assetCode: p.assetCode}}
                sampleCode={p.qrEvent.codes[0]?.code || 'SAMPLE123'}
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4">
          <div className="text-sm text-slate-500 mb-3">Event Timeline</div>
          <div className="flex items-center gap-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`h-6 w-6 rounded-full grid place-items-center ${
                    i <= idx
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {i <= idx ? '✓' : i + 1}
                </div>
                <span className="text-sm">{s}</span>
                {i < steps.length - 1 && (
                  <div className={`w-20 h-px ${i < idx ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Standard project flow
  const steps = ['Draft', 'Funded', 'Issued', 'Expired'];
  const idx = steps.findIndex((s) => s.toLowerCase() === p.status.toLowerCase());

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={p.name}
        description={`${p.kind === 'QR_EVENT' ? 'QR Event' : 'Standard'} Project • ${p.assetCode} • ${p.status}`}
        breadcrumbs={breadcrumbs}
        showBackButton={true}
        backLabel="Back to Projects"
      />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4">
          <div className="text-sm text-slate-500">BUDGET / ASSET</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {p.assetCode === 'USDC' ? `$${p.budget.toLocaleString()}` : `${p.budget} ${p.assetCode}`}
          </div>
          <div className="text-sm mt-1">{p.assetCode}</div>
        </div>

        <div className="col-span-12 md:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4">
          <div className="text-sm text-slate-500">SCHEDULE</div>
          <div className="mt-2 leading-6">
            <div>
              Issue At: <span className="font-medium">{p.schedule.issueAt}</span>
            </div>
            {p.schedule.expiresAt && (
              <div>
                Expires At: <span className="font-medium">{p.schedule.expiresAt}</span>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 md:col-span-3">
          <ProgressGraph 
            stats={p.stats} 
            totalRecipients={p.recipients?.length || 0}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4">
        <div className="text-sm text-slate-500 mb-3">Project Timeline</div>
        <div className="flex items-center gap-4">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full grid place-items-center ${
                  i <= idx
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {i <= idx ? '✓' : i + 1}
              </div>
              <span className="text-sm">{s}</span>
              {i < steps.length - 1 && (
                <div className={`w-20 h-px ${i < idx ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Recipients ({p.recipients?.length ?? 0})
        </h2>
        <div className="flex gap-2">
          <button className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/button border border-slate-300 dark:border-slate-600 shadow-md hover:shadow-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white/90 dark:hover:bg-slate-700/90">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Add Recipients</span>
          </button>
          <button className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/button border border-brand-text/10 dark:border-white/10 shadow-lg hover:shadow-xl bg-gradient-to-r from-cyan-500/80 to-teal-500/80 hover:from-cyan-400/90 hover:to-teal-400/90 dark:from-cyan-600/80 dark:to-teal-600/80 dark:hover:from-cyan-500/90 dark:hover:to-teal-500/90">
            <span className="text-sm font-semibold tracking-wide text-white">Build & Fund</span>
            <div className="absolute inset-0 rounded-full opacity-0 group-hover/button:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-cyan-300/20 to-teal-300/20 dark:from-cyan-400/20 dark:to-teal-400/20"></div>
          </button>
          <button className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/button border border-brand-text/10 dark:border-white/10 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-400/90 hover:to-indigo-400/90 dark:from-blue-600/80 dark:to-indigo-600/80 dark:hover:from-blue-500/90 dark:hover:to-indigo-500/90">
            <span className="text-sm font-semibold tracking-wide text-white">Issue</span>
            <div className="absolute inset-0 rounded-full opacity-0 group-hover/button:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-300/20 to-indigo-300/20 dark:from-blue-400/20 dark:to-indigo-400/20"></div>
          </button>
        </div>
      </div>

      {p.recipients?.length ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {p.recipients.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 grid place-items-center text-slate-700 dark:text-slate-200">
                    {r.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.amount} {r.asset}
                    </div>
                  </div>
                </div>
                <div className="text-slate-500">⋯</div>
              </div>
              <div className="mt-3">{statusChip(r.status)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300 mb-4">No recipients</p>
          <button className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/button border border-slate-300 dark:border-slate-600 shadow-md hover:shadow-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white/90 dark:hover:bg-slate-700/90 mx-auto">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Add Recipients</span>
          </button>
        </div>
      )}

      <div className="pt-4 pb-8 flex justify-end gap-2">
        <button className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/button border border-slate-300 dark:border-slate-600 shadow-md hover:shadow-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white/90 dark:hover:bg-slate-700/90">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Schedule</span>
        </button>
        <button className="relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/button border border-brand-text/10 dark:border-white/10 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-400/90 hover:to-indigo-400/90 dark:from-blue-600/80 dark:to-indigo-600/80 dark:hover:from-blue-500/90 dark:hover:to-indigo-500/90">
          <span className="text-sm font-semibold tracking-wide text-white">Issue Now</span>
          <div className="absolute inset-0 rounded-full opacity-0 group-hover/button:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-300/20 to-indigo-300/20 dark:from-blue-400/20 dark:to-indigo-400/20"></div>
        </button>
      </div>
    </div>
  );
}
