import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { Button } from '../ui/button';

interface ClaimSuccessProps {
  envelopeId: string;
  amount?: string;
  asset?: string;
  xdr?: string;
}

export const ClaimSuccess = ({ 
  envelopeId, 
  amount = '0', 
  asset = 'USDC',
  xdr 
}: ClaimSuccessProps) => {
  const navigate = useNavigate();
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddToWallet = () => {
    if (xdr) {
      // Deep link to Freighter or other Stellar wallet
      const deepLink = `web+stellar:tx?xdr=${encodeURIComponent(xdr)}`;
      window.location.href = deepLink;
    }
  };

  const handleViewActivity = () => {
    navigate(`/activity?envelopeId=${envelopeId}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.1}
        colors={['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']}
      />

      <div className="relative h-full flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-6">🎉</div>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Gift Claimed!
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
            You've successfully claimed
          </p>
          
          <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-8">
            {amount} {asset}
          </div>

          <div className="space-y-3">
            {xdr && (
              <Button
                onClick={handleAddToWallet}
                className="w-full"
                size="lg"
              >
                Add to Freighter
              </Button>
            )}
            
            <Button
              onClick={handleViewActivity}
              variant="outline"
              className="w-full"
              size="lg"
            >
              View Activity
            </Button>
          </div>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            Your gift has been added to your wallet
          </p>
        </div>
      </div>
    </div>
  );
};