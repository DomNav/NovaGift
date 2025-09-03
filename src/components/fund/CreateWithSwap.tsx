import { useState } from 'react';
import { SwapPanel } from './SwapPanel';
import { useCreateEnvelope } from '@/hooks/useCreateEnvelope';

interface CreateWithSwapProps {
  onAmountChange: (amount: string) => void;
  onAssetChange: (asset: 'XLM' | 'AQUA' | 'EURC' | 'USDC') => void;
  onCreateEnvelope?: (fundingDetails: {
    asset: 'XLM' | 'AQUA' | 'EURC' | 'USDC';
    venue: 'best' | 'dex' | 'amm';
    slippageBps: number;
    estimatedUsd: string;
  }) => void;
  disabled?: boolean;
  isCreating?: boolean;
  amount: string;
  selectedAsset: 'XLM' | 'AQUA' | 'EURC' | 'USDC';
  message?: string;
  expiresInMinutes?: number;
}

type Asset = 'XLM' | 'AQUA' | 'EURC' | 'USDC';
type Venue = 'best' | 'dex' | 'amm';

export const CreateWithSwap = ({
  onAmountChange,
  onAssetChange,
  onCreateEnvelope,
  disabled = false,
  isCreating: isCreatingProp = false,
  amount,
  selectedAsset,
  message,
  expiresInMinutes,
}: CreateWithSwapProps) => {
  const [selectedVenue, setSelectedVenue] = useState<Venue>('best'); // Default to 'best' for auto-routing
  const [slippageBps, setSlippageBps] = useState<number>(50);
  const { createEnvelope, isCreating: isCreatingHook } = useCreateEnvelope();
  
  const isCreating = isCreatingProp || isCreatingHook;

  const handleCreateClick = async () => {
    // Map selected asset to supported assets (XLM or USDC)
    const mappedAsset = (selectedAsset === 'XLM' || selectedAsset === 'USDC') 
      ? selectedAsset 
      : 'USDC'; // Default to USDC for unsupported assets
    
    // If a custom handler is provided, use it
    if (onCreateEnvelope) {
      const estimatedUsd = selectedAsset === 'USDC' ? amount : amount;
      onCreateEnvelope({
        asset: selectedAsset,
        venue: selectedVenue,
        slippageBps,
        estimatedUsd,
      });
    } else {
      // Otherwise use the hook to create envelope directly
      await createEnvelope({
        asset: mappedAsset,
        amount,
        message,
        expiresInMinutes,
      });
    }
  };

  return (
    <div className="space-y-4">
      <SwapPanel
        mode="exactIn"
        fromAsset={selectedAsset}
        toAsset="USDC"
        amount={amount}
        venue={selectedVenue}
        slippageBps={slippageBps}
        onAssetChange={onAssetChange}
        onVenueChange={setSelectedVenue}
        onSlippageChange={setSlippageBps}
        onAmountChange={onAmountChange}
        onBuildSwap={handleCreateClick}
        isBuilding={isCreating}
        disabled={disabled}
        className="mt-6"
        buttonText="Create Envelope"
        buttonIcon="✉"
      />
    </div>
  );
};
