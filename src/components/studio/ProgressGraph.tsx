import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useState } from 'react';
import { Stats } from '@/api/projects.api';

interface ProgressGraphProps {
  stats: Stats;
  totalRecipients?: number;
  className?: string;
}

type ChartType = 'donut' | 'bar' | 'trend';

const COLORS = {
  opened: '#10b981', // emerald-500
  pending: '#38bdf8', // sky-400
  expired: '#f59e0b', // amber-500
};

export default function ProgressGraph({ stats, totalRecipients = 100, className = '' }: ProgressGraphProps) {
  const [chartType, setChartType] = useState<ChartType>('donut');

  // Calculate actual counts from percentages
  const openedCount = Math.round((stats.opened / 100) * totalRecipients);
  const pendingCount = Math.round((stats.pending / 100) * totalRecipients);
  const expiredCount = Math.round((stats.expired / 100) * totalRecipients);

  const donutData = [
    { name: 'Opened', value: stats.opened, count: openedCount, color: COLORS.opened },
    { name: 'Pending', value: stats.pending, count: pendingCount, color: COLORS.pending },
    { name: 'Expired', value: stats.expired, count: expiredCount, color: COLORS.expired },
  ];

  // If all values are zero, show a placeholder
  const hasData = donutData.some(item => item.value > 0);
  const displayDonutData = hasData ? donutData.filter(item => item.value > 0) : [
    { name: 'No Data', value: 100, count: 0, color: '#e2e8f0' }
  ];

  const barData = [
    { status: 'Opened', percentage: stats.opened, count: openedCount, fill: COLORS.opened },
    { status: 'Pending', percentage: stats.pending, count: pendingCount, fill: COLORS.pending },
    { status: 'Expired', percentage: stats.expired, count: expiredCount, fill: COLORS.expired },
  ];

  // Mock trend data for demonstration
  const trendData = [
    { day: 'Day 1', opened: 0, pending: 100, expired: 0 },
    { day: 'Day 2', opened: 15, pending: 85, expired: 0 },
    { day: 'Day 3', opened: 35, pending: 65, expired: 0 },
    { day: 'Day 4', opened: 55, pending: 42, expired: 3 },
    { day: 'Day 5', opened: 70, pending: 25, expired: 5 },
    { day: 'Day 6', opened: 82, pending: 15, expired: 3 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
              {entry.payload?.count !== undefined && ` (${entry.payload.count} recipients)`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={displayDonutData} 
                innerRadius={35} 
                outerRadius={65} 
                dataKey="value" 
                paddingAngle={hasData ? 2 : 0}
                animationBegin={0}
                animationDuration={800}
              >
                {displayDonutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {hasData && <Tooltip content={<CustomTooltip />} />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
              <XAxis 
                dataKey="status" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                className="fill-slate-600 dark:fill-slate-400"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                className="fill-slate-600 dark:fill-slate-400"
                domain={[0, 'dataMax']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="percentage" 
                radius={[4, 4, 0, 0]}
                animationBegin={0}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'trend':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                className="fill-slate-600 dark:fill-slate-400"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                className="fill-slate-600 dark:fill-slate-400"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="opened" 
                stroke={COLORS.opened} 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Opened"
                animationBegin={0}
                animationDuration={800}
              />
              <Line 
                type="monotone" 
                dataKey="pending" 
                stroke={COLORS.pending} 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Pending"
                animationBegin={200}
                animationDuration={800}
              />
              <Line 
                type="monotone" 
                dataKey="expired" 
                stroke={COLORS.expired} 
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Expired"
                animationBegin={400}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 ${className}`}>
      {/* Header with chart type selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-500 font-medium">PROGRESS</div>
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setChartType('donut')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              chartType === 'donut'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Donut
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              chartType === 'bar'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType('trend')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              chartType === 'trend'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Trend
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="h-40 mb-4">
        {renderChart()}
      </div>

      {/* Stats summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.opened }}></div>
            <span className="text-slate-600 dark:text-slate-400">Opened</span>
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {stats.opened}% ({openedCount})
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pending }}></div>
            <span className="text-slate-600 dark:text-slate-400">Pending</span>
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {stats.pending}% ({pendingCount})
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.expired }}></div>
            <span className="text-slate-600 dark:text-slate-400">Expired</span>
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">
            {stats.expired}% ({expiredCount})
          </div>
        </div>
      </div>

      {/* Additional metrics */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-slate-500">Success Rate</div>
            <div className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.opened > 0 ? `${Math.round((stats.opened / (stats.opened + stats.expired)) * 100)}%` : '—'}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Completion</div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {stats.opened + stats.expired}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
