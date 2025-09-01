import { useState } from 'react';
import { ProjectKind } from '@/api/projects.api';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (kind: ProjectKind) => void;
}

export function NewProjectModal({ isOpen, onClose, onCreateProject }: NewProjectModalProps) {
  const [selectedKind, setSelectedKind] = useState<ProjectKind | null>(null);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (selectedKind) {
      onCreateProject(selectedKind);
      onClose();
      setSelectedKind(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Create New Project
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Choose the type of project you want to create
        </p>

        <div className="space-y-3 mb-6">
          <div
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedKind === 'STANDARD'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            onClick={() => setSelectedKind('STANDARD')}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 ${
                selectedKind === 'STANDARD' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {selectedKind === 'STANDARD' && (
                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">
                  Standard Gift
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Traditional gifting with email or direct wallet transfers. Perfect for targeted recipients and personalized messages.
                </p>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedKind === 'QR_EVENT'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            onClick={() => setSelectedKind('QR_EVENT')}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 ${
                selectedKind === 'QR_EVENT' 
                  ? 'border-purple-500 bg-purple-500' 
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {selectedKind === 'QR_EVENT' && (
                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100">
                  QR Event
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  QR code-based gifting for events, stores, or public distributions. Generate codes, posters, and track claims in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedKind}
            className={`flex-1 px-4 py-2 rounded-xl text-white transition-colors ${
              selectedKind
                ? selectedKind === 'STANDARD'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-purple-500 hover:bg-purple-600'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
            }`}
          >
            Create {selectedKind === 'STANDARD' ? 'Gift' : selectedKind === 'QR_EVENT' ? 'Event' : 'Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
