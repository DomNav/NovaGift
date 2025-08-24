import { useState } from 'react';
import { 
  createEnvelope as createEnvelopeOnChain, 
  openEnvelope as openEnvelopeOnChain,
  approveToken,
  ENVELOPE_CONTRACT,
  USDC_CONTRACT,
  WXLM_CONTRACT
} from '../lib/wallet';
import { toast } from 'sonner';

interface CreateEnvelopeParams {
  recipient: string;
  asset: 'USDC' | 'XLM';
  amount: string;
}

interface EnvelopeState {
  isCreating: boolean;
  isOpening: boolean;
  error: string | null;
}

export function useEnvelope() {
  const [state, setState] = useState<EnvelopeState>({
    isCreating: false,
    isOpening: false,
    error: null,
  });

  const createEnvelope = async (params: CreateEnvelopeParams) => {
    setState(prev => ({ ...prev, isCreating: true, error: null }));
    
    try {
      const assetContract = params.asset === 'USDC' ? USDC_CONTRACT : WXLM_CONTRACT;
      const amountInStroops = BigInt(Math.floor(parseFloat(params.amount) * 1_000_000));
      
      if (!ENVELOPE_CONTRACT) {
        throw new Error('Envelope contract not configured. Please deploy the contract first.');
      }
      
      const approvalResult = await approveToken(
        assetContract,
        ENVELOPE_CONTRACT,
        amountInStroops
      );
      
      if (!approvalResult.success) {
        throw new Error(approvalResult.error || 'Failed to approve token');
      }
      
      const result = await createEnvelopeOnChain(
        params.recipient,
        assetContract,
        amountInStroops,
        'USD'
      );
      
      if (result.success && result.envelopeId !== undefined) {
        toast.success(`Envelope created with ID: ${result.envelopeId}`);
        
        const address = await window.localStorage.getItem('wallet_address');
        if (address) {
          await fetch('http://localhost:4000/api/km/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address,
              deltaKm: 10,
              deltaUsd: Math.floor(parseFloat(params.amount)),
              action: 'envelope_created',
              envelopeId: result.envelopeId
            })
          });
        }
        
        await fetch('http://localhost:4000/api/envelopes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: result.envelopeId.toString(),
            creatorAddress: address,
            recipientAddress: params.recipient,
            amountUsd: Math.floor(parseFloat(params.amount))
          })
        });
        
        setState(prev => ({ ...prev, isCreating: false }));
        return { success: true, envelopeId: result.envelopeId };
      } else {
        throw new Error(result.error || 'Failed to create envelope');
      }
    } catch (error: any) {
      console.error('Create envelope error:', error);
      const errorMessage = error.message || 'Failed to create envelope';
      toast.error(errorMessage);
      setState(prev => ({ 
        ...prev, 
        isCreating: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  };

  const openEnvelope = async (envelopeId: number) => {
    setState(prev => ({ ...prev, isOpening: true, error: null }));
    
    try {
      const result = await openEnvelopeOnChain(envelopeId);
      
      if (result.success && result.usdAmount !== undefined) {
        const usdValue = Number(result.usdAmount) / 1_000_000;
        toast.success(`Envelope opened! USD value: $${usdValue.toFixed(2)}`);
        
        const address = await window.localStorage.getItem('wallet_address');
        if (address) {
          await fetch('http://localhost:4000/api/km/award', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address,
              deltaKm: 1,
              deltaUsd: Math.floor(usdValue),
              action: 'envelope_opened',
              envelopeId
            })
          });
          
          await fetch(`http://localhost:4000/api/envelopes/${envelopeId}/open`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientAddress: address,
              amountUsd: Math.floor(usdValue)
            })
          });
        }
        
        setState(prev => ({ ...prev, isOpening: false }));
        return { success: true, usdAmount: usdValue };
      } else {
        throw new Error(result.error || 'Failed to open envelope');
      }
    } catch (error: any) {
      console.error('Open envelope error:', error);
      const errorMessage = error.message || 'Failed to open envelope';
      toast.error(errorMessage);
      setState(prev => ({ 
        ...prev, 
        isOpening: false, 
        error: errorMessage 
      }));
      return { success: false, error: errorMessage };
    }
  };

  return {
    createEnvelope,
    openEnvelope,
    isCreating: state.isCreating,
    isOpening: state.isOpening,
    error: state.error,
  };
}