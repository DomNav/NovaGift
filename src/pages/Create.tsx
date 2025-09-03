import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnvelopeCard } from '@/components/ui/EnvelopeCard';
import { EnvelopeOpeningDemo } from '@/components/ui/EnvelopeOpeningDemo';
import { useToast } from '@/hooks/useToast';
import { useSkins } from '@/store/skins';
import { CreateWithSwap } from '@/components/fund/CreateWithSwap';
import { AppShell } from '@/components/layout/AppShell';

export const Create = () => {
  const { addToast } = useToast();
  const [recipient, setRecipient] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('100');
  const [expiry, setExpiry] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [asset, setAsset] = useState<'XLM' | 'AQUA' | 'EURC' | 'USDC'>('XLM');

  const { selectedSealedId, selectedOpenedId, hydrate, getById } = useSkins();

  const isValidXlmAmount = (s: string) => /^\d+(\.\d{1,7})?$/.test(s.trim());
  const isG = (g: string) => g?.trim().toUpperCase().startsWith('G');

  useEffect(() => {
    hydrate();
  }, []);

  const sealedSkin = getById(selectedSealedId);
  const openedSkin = getById(selectedOpenedId);

  const handleCreate = async (fundingDetails?: {
    asset: 'XLM' | 'AQUA' | 'EURC' | 'USDC';
    venue: 'best' | 'dex' | 'amm';
    slippageBps: number;
    estimatedUsd: string;
  }) => {
    if (!recipient) {
      addToast('Please enter a recipient address', 'error');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }

    setIsCreating(true);

    try {
      // In a real implementation, this would create the envelope with funding details
      const envelopeData = {
        recipient,
        recipientEmail,
        amount,
        expiry,
        fundingAsset: asset,
        fundingVenue: fundingDetails?.venue || 'best',
        slippageBps: fundingDetails?.slippageBps || 50,
        estimatedUsd: fundingDetails?.estimatedUsd || amount,
      };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      addToast(`Envelope created successfully! Fund with ${asset} when ready.`, 'success');

      // Reset form
      setRecipient('');
      setRecipientEmail('');
      setAmount('100');
      setExpiry('');
    } catch (error) {
      addToast('Failed to create envelope. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 300 }}
      >
        <motion.h1 
          className="text-3xl font-antonio gradient-text mb-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          Create Gift Envelope
        </motion.h1>
        <AnimatePresence mode="wait">
          <motion.p 
            key={asset}
            className="text-brand-text/60"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
Send gifts in any asset that recipients can claim as USDC
          </motion.p>
        </AnimatePresence>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
        {/* Form */}
        <motion.div 
          className="min-w-0 space-y-6"
          key={asset}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
        >
          <motion.div 
            className="glass-card p-6 space-y-4"
            whileHover={{ 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              transform: 'translateY(-2px)'
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2">Recipient Address</label>
              <motion.input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="G..."
                className="input-base"
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2">Recipient Email (Optional)</label>
              <motion.input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="input-base"
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
              <p className="text-xs text-brand-text/50 mt-1">
                We'll notify them when the envelope is funded
              </p>
            </motion.div>



            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <label className="block text-sm font-medium mb-2">Expiry Date (Optional)</label>
              <motion.input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="input-base"
                min={new Date().toISOString().split('T')[0]}
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
              <p className="text-xs text-brand-text/50 mt-1">
                If not opened by this date, funds will be returned
              </p>
            </motion.div>
          </motion.div>

          {/* Funding Selection */}
          <CreateWithSwap
            amount={amount}
            selectedAsset={asset}
            onAmountChange={setAmount}
            onAssetChange={setAsset}
            onCreateEnvelope={handleCreate}
            disabled={!recipient || !amount}
            isCreating={isCreating}
          />

          <motion.div 
            className="glass-card p-4 space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
            <h3 className="text-sm font-medium flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 8] }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  repeatType: "reverse",
                  repeatDelay: 3,
                  ease: "easeInOut"
                }}
              >
                ℹ
              </motion.span>
              How it works
            </h3>
            <motion.ul 
              className="text-xs text-brand-text/60 space-y-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9, duration: 0.2 }}
              >
                • Create a sealed envelope funded with {asset}
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0, duration: 0.2 }}
              >
                • Share the envelope ID with the recipient
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1, duration: 0.2 }}
              >
                • Recipient opens to receive USDC instantly
              </motion.li>
              <motion.li
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.2 }}
              >
                • Funds are secured by smart contract escrow
              </motion.li>
            </motion.ul>
          </motion.div>
        </motion.div>

        {/* Preview */}
        <motion.div 
          className="min-w-0 space-y-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.4, type: 'spring', stiffness: 300 }}
        >
          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            <h3 className="text-lg font-medium mb-4">Live Preview</h3>

            {/* Sealed Preview */}
            <div className="space-y-4">
              <motion.div 
                className="text-center"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <h4 className="text-sm font-medium text-brand-text/80 mb-2">Sealed Envelope</h4>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={asset}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.3, type: 'spring', stiffness: 400 }}
                  >
                    <EnvelopeCard
                      variant="sealed"
                      skin={sealedSkin}
                      usdCents={parseFloat(amount || '0') * 100}
                      asset={asset}
                      toLabel={recipient || 'GDEMO...RECIPIENT'}
                      fromLabel="You"
                    />
                  </motion.div>
                </AnimatePresence>
                <p className="text-xs text-brand-text/60 mt-2">
                  How the envelope appears before opening
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Opening Demo */}
          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            <h4 className="text-sm font-medium text-brand-text/80 mb-4">Opening Experience</h4>
            <AnimatePresence mode="wait">
              <motion.div
                key={asset}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 400 }}
              >
                <EnvelopeOpeningDemo
                  sealedSkin={sealedSkin}
                  openedSkin={openedSkin}
                  usdCents={parseFloat(amount || '0') * 100}
                  asset={asset}
                  toLabel={recipient || 'GDEMO...RECIPIENT'}
                  fromLabel="You"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
      </div>
    </AppShell>
  );
};
