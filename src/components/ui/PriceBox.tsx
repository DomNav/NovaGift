import { useState } from 'react';
import { PaymentToggle } from './PaymentToggle';
import { useAssetPrice } from '@/hooks/usePrices';

interface PriceBoxProps {
  amount: string;
  onPaymentMethodChange?: (method: 'USDC' | 'XLM') => void;
}

export const PriceBox = ({ amount, onPaymentMethodChange }: PriceBoxProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'USDC' | 'XLM'>('USDC');

  const handleMethodChange = (method: 'USDC' | 'XLM') => {
    setPaymentMethod(method);
    onPaymentMethodChange?.(method);
  };

  // Fetch live prices for XLM and USDC (USDC typically ~= 1 USD)
  const {
    data: xlmPriceData,
    isLoading: xlmLoading,
    error: xlmError,
  } = useAssetPrice('XLM');

  const {
    data: usdcPriceData,
    isLoading: usdcLoading,
    error: usdcError,
  } = useAssetPrice('USDC');

  // Calculate conversion rate and display amounts
  const xlmUsdPrice = xlmPriceData?.priceUsd ?? 0;
  const usdcUsdPrice = usdcPriceData?.priceUsd ?? 1; // default to 1 if unavailable

  // 1 USDC (≈1 USD) equals how many XLM?
  const usdcToXlmRate = xlmUsdPrice > 0 ? (1 / xlmUsdPrice) : 0;

  // Determine amount to display based on selected payment method
  const displayAmount = paymentMethod === 'XLM'
    ? (parseFloat(amount) * usdcUsdPrice * usdcToXlmRate).toFixed(2)
    : amount;

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-brand-text/60">Paying with</label>
        <PaymentToggle value={paymentMethod} onChange={handleMethodChange} />
      </div>

      <div className="border-t border-white/10 pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-brand-text/60">Amount</span>
          <span className="text-lg font-medium">
            {displayAmount} {paymentMethod}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-brand-text/60">Network Fee</span>
          <span className="text-sm">0.00001 XLM</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-brand-text/60">Reflector Price</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {xlmLoading || usdcLoading || usdcToXlmRate === 0
                ? 'Loading...'
                : `1 USDC = ${usdcToXlmRate.toFixed(3)} XLM`}
            </span>
            <span className="text-xs text-brand-positive">Live</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total</span>
          <span className="text-xl font-antonio gradient-text">
            {displayAmount} {paymentMethod}
          </span>
        </div>
      </div>

      <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-brand-primary rounded text-white font-medium">
            Best Route
          </span>
          <span className="text-xs text-brand-text/80">via Soroswap Protocol</span>
        </div>
      </div>
    </div>
  );
};
