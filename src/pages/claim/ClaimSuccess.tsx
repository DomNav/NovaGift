import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchEnvelope, formatEnvelopeAmount } from '../../store/claim';

export function ClaimSuccess() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch envelope data to show success details
  const { data: envelope, isLoading } = useQuery({
    queryKey: ['envelope', id],
    queryFn: () => fetchEnvelope(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Gift Claimed Successfully!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          Congratulations! You've successfully claimed your gift.
        </p>
        
        {envelope && (
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-6">
            {formatEnvelopeAmount(envelope.amount, envelope.assetCode)}
          </div>
        )}
        
        <div className="space-y-3">
          <button 
            onClick={() => window.open('https://stellar.expert', '_blank')}
            className="block w-full px-6 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
          >
            View on Stellar Explorer
          </button>
          <button 
            onClick={() => navigate('/')}
            className="block w-full px-6 py-2 border border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            Create Your Own Gift
          </button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-emerald-200 dark:border-emerald-700 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Powered by <span className="font-medium">NovaGift</span> on Stellar
          </p>
        </div>
      </div>
    </div>
  );
}
