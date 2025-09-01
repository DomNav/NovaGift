import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { fetchProjects, type ProjectRow, type ProjectKind } from '@/api/projects.api';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { PageHeader } from '@/components/PageHeader';

const statusPill = (s: ProjectRow['status']) => {
  const map: Record<ProjectRow['status'], string> = {
    DRAFT: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
    FUNDED: 'bg-cyan-200 text-cyan-900 dark:bg-cyan-700 dark:text-white',
    ACTIVE: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700 dark:text-white',
    ENDED: 'bg-orange-200 text-orange-900 dark:bg-orange-700 dark:text-white',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[s]}`}>
      {s[0] + s.slice(1).toLowerCase()}
    </span>
  );
};

const kindPill = (k: ProjectRow['kind']) => {
  const map: Record<ProjectRow['kind'], string> = {
    STANDARD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    QR_EVENT: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[k]}`}>
      {k === 'QR_EVENT' ? 'QR Event' : 'Standard'}
    </span>
  );
};

export default function ProjectsIndex() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['projects'], queryFn: fetchProjects });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const handleCreateProject = (kind: ProjectKind) => {
    // For now, navigate to a mock project or create endpoint
    console.log('Creating project of kind:', kind);
    // TODO: Implement actual project creation
  };

  if (isLoading) return <div className="p-6 text-slate-500">Loading projects…</div>;

  const projects = data ?? [];

  const breadcrumbs = [
    { label: 'Studio', href: '/studio' },
    { label: 'Projects' }
  ];

  if (!projects.length) {
    return (
      <div className="p-6">
        <PageHeader
          title="Projects"
          description="Manage and track your gift projects"
          breadcrumbs={breadcrumbs}
        />
        <div className="p-10 text-center">
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-4">No projects yet</p>
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="relative flex items-center gap-3 px-6 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/button border border-brand-text/10 dark:border-white/10 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-400/90 hover:to-indigo-400/90 dark:from-blue-600/80 dark:to-indigo-600/80 dark:hover:from-blue-500/90 dark:hover:to-indigo-500/90">
            <span className="text-sm font-semibold tracking-wide text-white">Create your first project</span>
            <div className="absolute inset-0 rounded-full opacity-0 group-hover/button:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-300/20 to-indigo-300/20 dark:from-blue-400/20 dark:to-indigo-400/20"></div>
          </button>
        </div>
      </div>
    );
  }

  // aggregate stats for donut
  const totals = projects.reduce(
    (acc, p) => {
      acc.opened += p.stats.opened;
      acc.pending += p.stats.pending;
      acc.expired += p.stats.expired;
      return acc;
    },
    { opened: 0, pending: 0, expired: 0 },
  );

  const donut = [
    { name: 'Opened', value: totals.opened },
    { name: 'Pending', value: totals.pending },
    { name: 'Expired', value: totals.expired },
  ];
  const COLORS = ['#10b981', '#38bdf8', '#f59e0b']; // emerald, sky, amber

  return (
    <div className="p-6">
      <PageHeader
        title="Projects"
        description="Manage and track your gift projects"
        breadcrumbs={breadcrumbs}
      >
        <button 
          onClick={() => setShowNewProjectModal(true)}
          className="relative flex items-center gap-3 px-6 py-2 rounded-full transition-all duration-300 backdrop-blur-xl group/button border border-brand-text/10 dark:border-white/10 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-400/90 hover:to-indigo-400/90 dark:from-blue-600/80 dark:to-indigo-600/80 dark:hover:from-blue-500/90 dark:hover:to-indigo-500/90">
          <span className="text-sm font-semibold tracking-wide text-white">+ New Project</span>
          <div className="absolute inset-0 rounded-full opacity-0 group-hover/button:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-blue-300/20 to-indigo-300/20 dark:from-blue-400/20 dark:to-indigo-400/20"></div>
        </button>
      </PageHeader>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-9">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 backdrop-blur">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Recipients</th>
                  <th className="px-6 py-3">Asset</th>
                  <th className="px-6 py-3">Budget</th>
                  <th className="px-6 py-3">Schedule</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-0 border-slate-100/80 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 cursor-pointer"
                    onClick={() => nav(`/studio/projects/${p.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{p.name}</td>
                    <td className="px-6 py-4">{kindPill(p.kind)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {p.kind === 'QR_EVENT' ? `${p.recipientsCount} codes` : `${p.recipientsCount} recipients`}
                    </td>
                    <td className="px-6 py-4">{p.assetCode}</td>
                    <td className="px-6 py-4">
                      {p.assetCode === 'USDC' ? `$${p.budget.toLocaleString()}` : `${p.budget} ${p.assetCode}`}
                    </td>
                    <td className="px-6 py-4">{p.schedule.issueAt}</td>
                    <td className="px-6 py-4">{statusPill(p.status)}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">⋯</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 backdrop-blur">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Gift Status Overview</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                    {donut.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-center justify-between">
                <span>Opened</span>
                <span className="font-medium">{totals.opened}%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Pending</span>
                <span className="font-medium">{totals.pending}%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Expired</span>
                <span className="font-medium">{totals.expired}%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
