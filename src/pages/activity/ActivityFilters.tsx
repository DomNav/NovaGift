import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import 'react-day-picker/style.css';

interface ActivityFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  projectId?: string;
}

export interface FilterState {
  type: 'all' | 'sent' | 'received' | 'created' | 'returned' | 'expired';
  dateFrom?: Date;
  dateTo?: Date;
  projectId?: string;
}

export const ActivityFilters = ({ onFiltersChange, projectId }: ActivityFiltersProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    type: (searchParams.get('type') as FilterState['type']) || 'all',
    dateFrom: searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined,
    dateTo: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
    projectId: projectId || searchParams.get('projectId') || undefined,
  });

  // Fetch projects if projectId is present
  useEffect(() => {
    if (projectId || searchParams.get('projectId')) {
      fetch('/api/projects')
        .then(res => res.json())
        .then(data => setProjects(data))
        .catch(console.error);
    }
  }, [projectId, searchParams]);

  const handleTypeChange = (type: FilterState['type']) => {
    const newFilters = { ...filters, type };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    params.set('type', type);
    setSearchParams(params);
  };

  const handleDateChange = (range: { from?: Date; to?: Date }) => {
    const newFilters = {
      ...filters,
      dateFrom: range.from,
      dateTo: range.to,
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (range.from) {
      params.set('from', format(range.from, 'yyyy-MM-dd'));
    } else {
      params.delete('from');
    }
    if (range.to) {
      params.set('to', format(range.to, 'yyyy-MM-dd'));
    } else {
      params.delete('to');
    }
    setSearchParams(params);
  };

  const handleProjectChange = (projectId: string) => {
    const newFilters = {
      ...filters,
      projectId: projectId === 'all' ? undefined : projectId,
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (projectId === 'all') {
      params.delete('projectId');
    } else {
      params.set('projectId', projectId);
    }
    setSearchParams(params);
  };

  const typeOptions: Array<{ value: FilterState['type']; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'sent', label: 'Sent' },
    { value: 'received', label: 'Received' },
    { value: 'created', label: 'Created' },
    { value: 'returned', label: 'Returned' },
    { value: 'expired', label: 'Expired' },
  ];

  const handleExportCSV = async () => {
    const params = new URLSearchParams();
    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.dateFrom) params.set('from', format(filters.dateFrom, 'yyyy-MM-dd'));
    if (filters.dateTo) params.set('to', format(filters.dateTo, 'yyyy-MM-dd'));
    if (filters.projectId) params.set('projectId', filters.projectId);

    try {
      const response = await fetch(`/api/activity/export?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Filters
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
        >
          📥 Export CSV
        </Button>
      </div>

      {/* Type Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {typeOptions.map(option => (
          <button
            key={option.value}
            onClick={() => handleTypeChange(option.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filters.type === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Date Range Picker */}
      <div className="relative">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 
            hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
        >
          📅
          {filters.dateFrom || filters.dateTo ? (
            <span>
              {filters.dateFrom ? format(filters.dateFrom, 'MMM d, yyyy') : 'Start'} - 
              {filters.dateTo ? format(filters.dateTo, 'MMM d, yyyy') : 'End'}
            </span>
          ) : (
            <span>Select date range</span>
          )}
        </button>

        {showDatePicker && (
          <div className="absolute top-full mt-2 z-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <DayPicker
              mode="range"
              selected={{
                from: filters.dateFrom,
                to: filters.dateTo,
              }}
              onSelect={(range) => {
                if (range) {
                  handleDateChange({ from: range.from, to: range.to });
                }
                setShowDatePicker(false);
              }}
              className="p-3"
            />
          </div>
        )}
      </div>

      {/* Project Filter (if applicable) */}
      {(projectId || projects.length > 0) && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Project
          </label>
          <select
            value={filters.projectId || 'all'}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
              bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};