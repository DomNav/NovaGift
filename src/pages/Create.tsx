import { useState, useEffect } from 'react';
import { EnvelopeCard } from '@/components/ui/EnvelopeCard';
import { EnvelopeOpeningDemo } from '@/components/ui/EnvelopeOpeningDemo';
import { useToast } from '@/hooks/useToast';
import { useSkins } from '@/store/skins';
import { sendXlmWithFreighter } from '@/services/xlm';

export const Create = () => {
  const { addToast } = useToast();
  const [recipient, setRecipient] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('100');
  const [expiry, setExpiry] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [asset, setAsset] = useState<'USDC' | 'XLM'>('USDC');

  const { selectedSealedId, selectedOpenedId, hydrate, getById } = useSkins();

  const isValidXlmAmount = (s: string) => /^\d+(\.\d{1,7})?$/.test(s.trim());
  const isG = (g: string) => g?.trim().toUpperCase().startsWith('G');

  useEffect(() => {
    hydrate();
  }, []);

  const sealedSkin = getById(selectedSealedId);
  const openedSkin = getById(selectedOpenedId);

  const handleCreate = async () => {
    if (!recipient) {
      addToast('Please enter a recipient address', 'error');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    setIsCreating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsCreating(false);
    addToast('Envelope created successfully!', 'success');

    // Reset form
    setRecipient('');
    setRecipientEmail('');
    setAmount('100');
    setExpiry('');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-antonio gradient-text mb-2">Create Gift Envelope</h1>
        <p className="text-brand-text/60">Send USDC gifts that can be opened later</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="G..."
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Recipient Email (Optional)</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="input-base"
              />
              <p className="text-xs text-brand-text/50 mt-1">
                We'll notify them when the envelope is funded
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium mb-2">Amount ({asset})</label>
                <div className="flex bg-brand-bg/40 rounded-full p-1">
                  {(['USDC', 'XLM'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAsset(a)}
                      className={`px-3 py-1 text-xs rounded-full transition-all ${asset === a ? 'bg-brand-primary text-white' : 'text-brand-text/60'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {asset === 'USDC' ? (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/50">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100"
                    className="input-base pl-8"
                    min="0"
                    step="0.01"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="2"
                  className="input-base"
                />
              )}
              {asset === 'XLM' && (
                <p className="mt-2 text-xs text-brand-text/60">
                  Unfunded recipients are auto-created. For demos, send ≥ 2 XLM.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Expiry Date (Optional)</label>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="input-base"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-brand-text/50 mt-1">
                If not opened by this date, funds will be returned
              </p>
            </div>
          </div>

          {asset === 'USDC' ? (
            <button
              onClick={handleCreate}
              disabled={isCreating || !recipient || !amount}
              className="w-full btn-granite-primary flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>✉</span>
                  <span>Create Envelope</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  if (!isG(recipient)) throw new Error('Destination must start with G…');
                  if (!isValidXlmAmount(amount)) throw new Error('Amount must have ≤ 7 decimals');
                  // @ts-ignore
                  const network = await window.freighterApi.getNetwork?.();
                  if (network && network.toUpperCase().includes('PUBLIC')) {
                    throw new Error('Freighter is on Public. Switch to Testnet.');
                  }
                  // @ts-ignore
                  const sourcePublicKey = await window.freighterApi.getPublicKey();
                  const { hash } = await sendXlmWithFreighter({
                    sourcePublicKey,
                    destination: recipient.trim().toUpperCase(),
                    amount: amount.trim(),
                    memo: 'NovaGift ✉️',
                  });
                  addToast(`Sent ${amount} XLM — ${hash}`, 'success');
                } catch (e: any) {
                  addToast(e?.message ?? 'Send failed', 'error');
                }
              }}
              disabled={!recipient || !amount}
              className="w-full btn-granite-primary flex items-center justify-center gap-2"
            >
              <span>☄</span>
              <span>Send XLM (Testnet)</span>
            </button>
          )}

          <div className="glass-card p-4 space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <span>ℹ</span>
              How it works
            </h3>
            <ul className="text-xs text-brand-text/60 space-y-1">
              <li>• Create a sealed envelope with USDC</li>
              <li>• Share the envelope ID with the recipient</li>
              <li>• Recipient opens to receive funds instantly</li>
              <li>• Funds are secured by smart contract escrow</li>
            </ul>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-8">
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-medium mb-4">Live Preview</h3>

            {/* Sealed Preview */}
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-sm font-medium text-brand-text/80 mb-2">Sealed Envelope</h4>
                <EnvelopeCard
                  variant="sealed"
                  skin={sealedSkin}
                  usdCents={parseFloat(amount || '0') * 100}
                  toLabel={recipient || 'GDEMO...RECIPIENT'}
                  fromLabel="You"
                />
                <p className="text-xs text-brand-text/60 mt-2">
                  How the envelope appears before opening
                </p>
              </div>
            </div>
          </div>

          {/* Opening Demo */}
          <div className="flex flex-col items-center">
            <h4 className="text-sm font-medium text-brand-text/80 mb-4">Opening Experience</h4>
            <EnvelopeOpeningDemo
              sealedSkin={sealedSkin}
              openedSkin={openedSkin}
              usdCents={parseFloat(amount || '0') * 100}
              toLabel={recipient || 'GDEMO...RECIPIENT'}
              fromLabel="You"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
