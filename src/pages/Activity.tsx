import { useState } from 'react';
import clsx from 'clsx';
import { EnvelopeCard } from '@/components/ui/EnvelopeCard';
import { AppShell } from '@/components/layout/AppShell';

interface ActivityItem {
  id: string;
  type: 'sent' | 'received' | 'created';
  amount: string;
  currency: string;
  fundingAsset?: string; // The asset used to fund the envelope
  fundingAmount?: string; // The amount in funding asset
  status: 'completed' | 'pending' | 'expired';
  date: string;
  from: string;
  to: string;
}

const mockData: ActivityItem[] = [
  {
    id: '001',
    type: 'sent',
    amount: '100',
    currency: 'USDC',
    fundingAsset: 'XLM',
    fundingAmount: '222.22',
    status: 'completed',
    date: '2024-01-20',
    from: 'GDEMO...WALLET',
    to: 'GDEMO...ALICE',
  },
  {
    id: '002',
    type: 'received',
    amount: '250',
    currency: 'USDC',
    status: 'completed',
    date: '2024-01-19',
    from: 'GDEMO...BOB',
    to: 'GDEMO...WALLET',
  },
  {
    id: '003',
    type: 'created',
    amount: '50',
    currency: 'USDC',
    fundingAsset: 'AQUA',
    fundingAmount: '11905',
    status: 'pending',
    date: '2024-01-18',
    from: 'GDEMO...WALLET',
    to: 'GDEMO...CHARLIE',
  },
];

export const Activity = () => {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);

  const filteredData = mockData.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'sent') return item.type === 'sent' || item.type === 'created';
    return item.type === 'received';
  });

  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'expired':
        return 'text-red-400';
      default:
        return 'text-brand-text/60';
    }
  };

  const getTypeIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'sent':
        return '↗';
      case 'received':
        return '↙';
      case 'created':
        return '✉';
      default:
        return '•';
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Activity</h1>
        <p className="text-brand-text/60">Track all your envelope transactions</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={clsx(
            'relative px-4 py-2 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden',
            filter === 'all'
              ? 'text-white'
              : 'bg-brand-surface text-brand-text/60 hover:bg-brand-text/10'
          )}
          style={filter === 'all' ? {
            background: `linear-gradient(
              135deg,
              #1d2bff 0%,
              #4a5fff 15%,
              #6366f1 25%,
              #8b5cf6 35%,
              #64748b 45%,
              #475569 55%,
              #7c3aed 65%,
              #3b82f6 75%,
              #1e40af 85%,
              #1d2bff 100%
            )`,
            backgroundSize: '200% 200%',
            animation: 'granite-shift 4s ease-in-out infinite',
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 4px 12px rgba(29, 43, 255, 0.3),
              0 2px 4px rgba(0, 0, 0, 0.2)
            `
          } : {}}
        >
          <span className="font-semibold tracking-wide">All</span>
        </button>
        <button
          onClick={() => setFilter('sent')}
          className={clsx(
            'relative px-4 py-2 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden',
            filter === 'sent'
              ? 'text-white'
              : 'bg-brand-surface text-brand-text/60 hover:bg-brand-text/10'
          )}
          style={filter === 'sent' ? {
            background: `linear-gradient(
              135deg,
              #1d2bff 0%,
              #4a5fff 15%,
              #6366f1 25%,
              #8b5cf6 35%,
              #64748b 45%,
              #475569 55%,
              #7c3aed 65%,
              #3b82f6 75%,
              #1e40af 85%,
              #1d2bff 100%
            )`,
            backgroundSize: '200% 200%',
            animation: 'granite-shift 4s ease-in-out infinite',
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 4px 12px rgba(29, 43, 255, 0.3),
              0 2px 4px rgba(0, 0, 0, 0.2)
            `
          } : {}}
        >
          <span className="font-semibold tracking-wide">Sent</span>
        </button>
        <button
          onClick={() => setFilter('received')}
          className={clsx(
            'relative px-4 py-2 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden',
            filter === 'received'
              ? 'text-white'
              : 'bg-brand-surface text-brand-text/60 hover:bg-brand-text/10'
          )}
          style={filter === 'received' ? {
            background: `linear-gradient(
              135deg,
              #1d2bff 0%,
              #4a5fff 15%,
              #6366f1 25%,
              #8b5cf6 35%,
              #64748b 45%,
              #475569 55%,
              #7c3aed 65%,
              #3b82f6 75%,
              #1e40af 85%,
              #1d2bff 100%
            )`,
            backgroundSize: '200% 200%',
            animation: 'granite-shift 4s ease-in-out infinite',
            boxShadow: `
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 4px 12px rgba(29, 43, 255, 0.3),
              0 2px 4px rgba(0, 0, 0, 0.2)
            `
          } : {}}
        >
          <span className="font-semibold tracking-wide">Received</span>
        </button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Type</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Amount</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">From/To</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Status</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Date</th>
              <th className="text-left p-4 text-sm font-medium text-brand-text/80">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr
                key={item.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getTypeIcon(item.type)}</span>
                    <span className="text-sm capitalize">{item.type}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">${item.amount}</span>
                      <span className="text-sm text-brand-text/60 ml-1">{item.currency}</span>
                    </div>
                    {item.fundingAsset && item.fundingAmount && (
                      <div className="text-xs text-brand-text/60">
                        via {item.fundingAmount} {item.fundingAsset}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <div className="font-mono text-xs">
                      {item.type === 'received' ? item.from : item.to}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={clsx('text-sm capitalize', getStatusColor(item.status))}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-brand-text/60">
                  {new Date(item.date).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="text-sm text-brand-primary hover:text-brand-secondary transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="glass-card p-6 max-w-2xl w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-antonio">Envelope Details</h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-2xl hover:text-brand-text/60 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <EnvelopeCard
                  isSealed={selectedItem.status === 'pending'}
                  amount={selectedItem.amount}
                  sender={selectedItem.from}
                  recipient={selectedItem.to}
                />
              </div>

              <div className="space-y-4 pl-4">
                <div>
                  <label className="text-xs text-brand-text/60">Transaction ID</label>
                  <p className="font-mono text-sm">#{selectedItem.id}</p>
                </div>
                <div>
                  <label className="text-xs text-brand-text/60">Type</label>
                  <p className="capitalize">{selectedItem.type}</p>
                </div>
                <div>
                  <label className="text-xs text-brand-text/60">Amount</label>
                  <p className="text-lg font-medium">
                    ${selectedItem.amount} {selectedItem.currency}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-brand-text/60">Status</label>
                  <p className={clsx('capitalize', getStatusColor(selectedItem.status))}>
                    {selectedItem.status}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-brand-text/60">Date</label>
                  <p>{new Date(selectedItem.date).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
};
