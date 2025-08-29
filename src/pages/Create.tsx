import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnvelopeCard } from '@/components/ui/EnvelopeCard';
import { EnvelopeOpeningDemo } from '@/components/ui/EnvelopeOpeningDemo';
import { useToast } from '@/hooks/useToast';
import { useSkins } from '@/store/skins';
import { sendXlmWithFreighter } from '@/services/xlm';
import { CurrencyToggle } from '@/components/ui/CurrencyToggle';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

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
            Send {asset} gifts that can be opened later
          </motion.p>
        </AnimatePresence>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <motion.div 
          className="space-y-6"
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
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <motion.label 
                  className="block text-sm font-medium"
                  key={asset}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  Amount ({asset})
                </motion.label>
                <CurrencyToggle value={asset} onChange={setAsset} />
              </div>

              <CurrencyInput
                value={amount}
                onChange={setAmount}
                asset={asset}
                placeholder={asset === 'USDC' ? '100' : '2'}
                className="mb-2"
              />
              
              {asset === 'XLM' && (
                <motion.p
                  className="mt-2 text-xs text-brand-text/60"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                >
                  Unfunded recipients are auto-created. For demos, send ≥ 2 XLM.
                </motion.p>
              )}
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

          <AnimatePresence mode="wait">
            {asset === 'USDC' ? (
              <motion.button
                key="usdc-button"
                onClick={handleCreate}
                disabled={isCreating || !recipient || !amount}
                className="w-full relative flex items-center justify-center gap-3 px-6 py-3 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:animate-none"
                style={{
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
                  backgroundSize: isCreating || !recipient || !amount ? '100% 100%' : '200% 200%',
                  animation: isCreating || !recipient || !amount ? 'none' : 'granite-shift 4s ease-in-out infinite',
                  boxShadow: `
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    0 4px 12px rgba(29, 43, 255, 0.3),
                    0 2px 4px rgba(0, 0, 0, 0.2)
                  `
                }}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="font-semibold tracking-wide">Creating...</span>
                  </>
                ) : (
                  <>
                    <motion.span
                      initial={{ rotate: 0 }}
                      animate={{ rotate: [0, 5] }}
                      transition={{ 
                        duration: 0.3, 
                        repeat: Infinity, 
                        repeatType: "reverse",
                        repeatDelay: 2,
                        ease: "easeInOut"
                      }}
                      className="text-white"
                    >
                      ✉
                    </motion.span>
                    <span className="font-semibold tracking-wide">Create USDC Envelope</span>
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                key="xlm-button"
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
                className="w-full relative flex items-center justify-center gap-3 px-6 py-3 rounded-full font-medium transition-all duration-300 active:scale-95 transform overflow-hidden text-white disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:animate-none"
                style={{
                  background: `linear-gradient(
                    135deg,
                    #f59e0b 0%,
                    #fb923c 12%,
                    #f97316 25%,
                    #ea580c 37%,
                    #dc2626 50%,
                    #ea580c 62%,
                    #f97316 75%,
                    #fb923c 87%,
                    #f59e0b 100%
                  )`,
                  backgroundSize: (!recipient || !amount) ? '100% 100%' : '200% 200%',
                  animation: (!recipient || !amount) ? 'none' : 'granite-shift 4s ease-in-out infinite',
                  boxShadow: `
                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                    0 4px 12px rgba(245, 158, 11, 0.4),
                    0 2px 4px rgba(0, 0, 0, 0.2)
                  `
                }}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              >
                <motion.span
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, -5] }}
                  transition={{ 
                    duration: 0.3, 
                    repeat: Infinity, 
                    repeatType: "reverse",
                    repeatDelay: 2,
                    ease: "easeInOut"
                  }}
                  className="text-white"
                >
                  ☄
                </motion.span>
                <span className="font-semibold tracking-wide">Send XLM (Testnet)</span>
              </motion.button>
            )}
          </AnimatePresence>

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
                • Create a sealed envelope with {asset}
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
                • Recipient opens to receive funds instantly
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
          className="space-y-8"
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
  );
};
