import { useEffect, useState } from 'react';
import { ensureFreighter, signXdrWithFreighter, isFreighterConnected, connectWallet, formatAddress, isFreighterAvailable } from '@/lib/wallet';
import { subscribeWalletEvents, initFreighterWatch } from '@/lib/wallet/events';
import { useToast } from '@/hooks/useToast';
import { config } from '@/config';
import { MobileSignDialog } from '@/components/MobileSignDialog';
import { isMobileDevice } from '@/lib/wallet/freighter-mobile';
import { XLM_CONTRACT_ID, USDC_CONTRACT_ID } from '@/config/stellar';

export default function TestEnvelope() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'create' | 'open' | 'refund'>('create');
  const [waitingForFreighter, setWaitingForFreighter] = useState(false);
  const [freighterAction, setFreighterAction] = useState<{ type: 'create' | 'open'; xdr: string; network: string } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastSignError, setLastSignError] = useState<string>('');

  // Create envelope state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [asset, setAsset] = useState('XLM');
  const [expiryHours, setExpiryHours] = useState(24);
  const [lastEnvelopeId, setLastEnvelopeId] = useState<string>('');
  const [lastTxHash, setLastTxHash] = useState<string>('');

  // Open envelope state
  const [envelopeId, setEnvelopeId] = useState('');
  const [openResult, setOpenResult] = useState<any>(null);

  // Contract info from backend
  const [backendContractId, setBackendContractId] = useState<string>('');

  // Test settings
  const [useTestnet, setUseTestnet] = useState(true);
  const [autoFillRecipient, setAutoFillRecipient] = useState(true);

  // USDC trustline state
  const [checkingTrustline, setCheckingTrustline] = useState(false);
  const [needsUsdcTrustline, setNeedsUsdcTrustline] = useState(false);
  const [creatingTrustline, setCreatingTrustline] = useState(false);

  // Mobile signing
  const [showMobileSign, setShowMobileSign] = useState(false);
  const [pendingXdr, setPendingXdr] = useState<{ xdr: string; network: string; type: 'create' | 'open' } | null>(null);
  const isMobile = isMobileDevice();
  const [hasFreighterExtension, setHasFreighterExtension] = useState(false);

  // Wallet status
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletPk, setWalletPk] = useState('');
  const [walletErr, setWalletErr] = useState('');

  // Oracle freshness
  const [oracleAge, setOracleAge] = useState<number | null>(null);
  const [oracleFresh, setOracleFresh] = useState<boolean | null>(null);

  // Refund state
  const [refundEnvelopeId, setRefundEnvelopeId] = useState('');
  const [refundResult, setRefundResult] = useState<any>(null);
  const [refundCountdown, setRefundCountdown] = useState<number>(0);
  const [envelopeExpiryTime, setEnvelopeExpiryTime] = useState<number>(0);
  const [quickCreateMode, setQuickCreateMode] = useState(false); // 1-minute expiry mode

  // Balance tracking
  const [balances, setBalances] = useState<{
    creator: { xlm: string; wxlm: string };
    recipient: { xlm: string; wxlm: string };
  }>({
    creator: { xlm: '0', wxlm: '0' },
    recipient: { xlm: '0', wxlm: '0' }
  });
  const [checkingBalances, setCheckingBalances] = useState(false);
  const [recipientForBalance, setRecipientForBalance] = useState('');

  useEffect(() => {
    // Check for Freighter extension
    isFreighterAvailable()
      .then(setHasFreighterExtension)
      .catch(() => setHasFreighterExtension(false));

    // Fetch backend contract ID
    fetch(`${config.api.baseUrl}/api/envelope-mvp/contracts`)
      .then(res => res.json())
      .then(data => {
        if (data.envelopeId) {
          setBackendContractId(data.envelopeId);
        }
      })
      .catch(() => {
        // Ignore errors, just don't show contract ID
      });

    // Initial wallet check
    const checkWallet = async () => {
      try {
        const connected = await isFreighterConnected();
        setWalletConnected(!!connected);
        if (connected) {
          try {
            const addr = await ensureFreighter();
            setWalletPk(addr);
            setWalletErr('');
          } catch (e: any) {
            setWalletErr(e?.message || '');
          }
        } else {
          setWalletPk('');
        }
      } catch {
        // Ignore errors in wallet check
      }
    };
    checkWallet();

    // Subscribe to wallet events for instant updates
    const unsubscribe = subscribeWalletEvents((evt) => {
      if (evt.type === 'connected' || evt.type === 'accountChanged') {
        setWalletConnected(true);
        setWalletPk(evt.address || '');
        setWalletErr('');
      } else if (evt.type === 'disconnected') {
        setWalletConnected(false);
        setWalletPk('');
        setWalletErr('');
      }
    });

    // Initialize Freighter watch if available
    const unwatchFreighter = initFreighterWatch();

    // Poll wallet state every 5 seconds as fallback (reduced from 3s since we have events)
    const walletInterval = setInterval(checkWallet, 5000);

    // Poll oracle freshness every 15s
    const fetchOracle = async () => {
      try {
        const res = await fetch(`${config.api.baseUrl}/api/health`);
        const j = await res.json();
        setOracleAge(j?.oracle?.fxAgeSec ?? null);
        setOracleFresh(j?.oracle?.fresh ?? null);
      } catch {
        setOracleAge(null);
        setOracleFresh(null);
      }
    };
    fetchOracle();
    const oracleInterval = setInterval(fetchOracle, 15000);

    return () => {
      unsubscribe();
      unwatchFreighter();
      clearInterval(walletInterval);
      clearInterval(oracleInterval);
    };
  }, []);

  // Countdown timer for refund
  useEffect(() => {
    if (envelopeExpiryTime > 0) {
      const interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = envelopeExpiryTime - now;
        setRefundCountdown(Math.max(0, remaining));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [envelopeExpiryTime]);

  async function onConnectWallet() {
    setWalletErr('');
    try {
      const pk = await connectWallet();
      if (pk) {
        setWalletConnected(true);
        setWalletPk(pk);
        addToast('Wallet connected', 'success');
      } else {
        setWalletConnected(false);
        setWalletPk('');
        setWalletErr('Connection cancelled');
      }
    } catch (e: any) {
      setWalletConnected(false);
      setWalletPk('');
      setWalletErr(e?.message || 'Failed to connect wallet');
      addToast(e?.message || 'Failed to connect wallet', 'error');
    }
  }

  // Asset contract mappings
  const ASSETS = {
    XLM: XLM_CONTRACT_ID,  // Wrapped XLM
    USDC: USDC_CONTRACT_ID, // Test USDC
  };

  // Retry signing function
  async function retryFreighterSign() {
    if (!freighterAction) return;

    setIsRetrying(true);
    setLastSignError('');
    try {
      const signedXdr = await signXdrWithFreighter(freighterAction.xdr, freighterAction.network);
      if (!signedXdr || typeof signedXdr !== 'string') {
        throw new Error('Missing signed XDR from wallet');
      }

      const creator = await ensureFreighter();

      // Submit signed transaction
      const submitRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xdr: signedXdr,
          signer: creator
        }),
      }).then(r => r.json());

      if (!submitRes.ok) {
        throw new Error(submitRes.error || 'Failed to submit transaction');
      }

      if (freighterAction.type === 'create') {
        setLastTxHash(submitRes.hash);
        setLastEnvelopeId(String(submitRes.result));
        setEnvelopeId(String(submitRes.result));
        addToast(`Envelope #${submitRes.result} created successfully!`, 'success');
      } else {
        setOpenResult({
          hash: submitRes.hash,
          amount: submitRes.result,
          ledger: submitRes.ledger,
        });
        addToast(`Envelope opened! Amount: ${submitRes.result}`, 'success');
      }

      setWaitingForFreighter(false);
      setFreighterAction(null);
      setIsRetrying(false);
      setLastSignError('');
    } catch (error: any) {
      console.error('Retry signing error:', error);
      setIsRetrying(false);
      setLastSignError(error.message || 'Transaction signing failed. Please try again.');
      // Keep modal open for another retry
    } finally {
      setLoading(false);
    }
  }

  // Check if user has USDC trustline
  async function checkUsdcTrustline(accountId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${accountId}`);
      if (!res.ok) return false;

      const account = await res.json();
      const balances = account.balances || [];

      // Check if USDC trustline exists
      return balances.some((bal: any) =>
        bal.asset_type === 'credit_alphanum12' &&
        bal.asset_code === 'USDC' &&
        bal.asset_issuer === 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
      );
    } catch (error) {
      console.error('Error checking USDC trustline:', error);
      return false;
    }
  }

  // Create USDC trustline
  async function createUsdcTrustline() {
    setCreatingTrustline(true);
    try {
      const creator = await ensureFreighter();

      // Import Stellar SDK for building the trustline transaction
      const { Asset, Operation, TransactionBuilder, Networks, Account } = await import('@stellar/stellar-sdk');

      // Fetch account details
      const accountRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${creator}`);
      if (!accountRes.ok) {
        throw new Error('Failed to fetch account details');
      }
      const account = await accountRes.json();

      // Create USDC asset
      const usdcAsset = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');

      // Build trustline transaction
      const sourceAccount = new Account(creator, account.sequence);
      const transaction = new TransactionBuilder(sourceAccount, {
        fee: '100000', // 0.01 XLM
        networkPassphrase: Networks.TESTNET
      })
        .addOperation(Operation.changeTrust({
          asset: usdcAsset
        }))
        .setTimeout(300)
        .build();

      const xdr = transaction.toXDR();

      addToast('Please sign the trustline transaction in Freighter...', 'info');

      // Sign with Freighter
      const signedXdr = await signXdrWithFreighter(xdr, Networks.TESTNET);

      // Submit to network
      const submitRes = await fetch('https://horizon-testnet.stellar.org/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `tx=${encodeURIComponent(signedXdr)}`
      });

      if (!submitRes.ok) {
        const error = await submitRes.json();
        throw new Error(error.extras?.result_codes?.operations?.[0] || 'Failed to create trustline');
      }

      addToast('USDC trustline created successfully!', 'success');
      setNeedsUsdcTrustline(false);

      // Now proceed with envelope creation
      await createEnvelope();
    } catch (error: any) {
      console.error('Trustline creation error:', error);
      addToast(error.message || 'Failed to create USDC trustline', 'error');
    } finally {
      setCreatingTrustline(false);
    }
  }

  async function createEnvelope() {
    // Use 1-minute expiry if in quick mode
    const effectiveExpiryHours = quickCreateMode ? 0.0167 : expiryHours; // 0.0167 hours = 1 minute

    // Check for USDC trustline first
    if (asset === 'USDC' && !checkingTrustline) {
      setCheckingTrustline(true);
      try {
        const creator = await ensureFreighter();
        const hasTrustline = await checkUsdcTrustline(creator);
        if (!hasTrustline) {
          setNeedsUsdcTrustline(true);
          setCheckingTrustline(false);
          addToast('USDC trustline required. Please create it first.', 'info');
          return;
        }
        setNeedsUsdcTrustline(false);
      } catch (error) {
        console.error('Trustline check error:', error);
      } finally {
        setCheckingTrustline(false);
      }
    }

    setLoading(true);
    setLastEnvelopeId('');
    setLastTxHash('');

    try {
      const creator = await ensureFreighter();
      const finalRecipient = recipient || (autoFillRecipient ? creator : '');

      if (!finalRecipient) {
        throw new Error('Recipient address required');
      }

      // Build transaction
      const buildRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator,
          recipient: finalRecipient,
          asset: ASSETS[asset as keyof typeof ASSETS],
          amount,
          denom: 'USD',
          expiry_secs: Math.floor(effectiveExpiryHours * 3600),
        }),
      }).then(r => r.json());

      if (!buildRes.ok) {
        const errorMsg = buildRes.message
          ? `${buildRes.error || 'Failed to build transaction'}: ${buildRes.message}`
          : buildRes.error || 'Failed to build transaction';
        throw new Error(errorMsg);
      }
      if (!buildRes.xdr || typeof buildRes.xdr !== 'string') {
        throw new Error('Server did not return XDR (build failed)');
      }

      // Check if we should use mobile signing
      if (!hasFreighterExtension || isMobile) {
        addToast('Please sign using Freighter Mobile', 'info');
        setPendingXdr({ xdr: buildRes.xdr, network: buildRes.network, type: 'create' });
        setShowMobileSign(true);
        setLoading(false);
        return;
      }

      // Pre-sign guard: Check if account changed and rebuild if necessary
      const currentPk = await ensureFreighter(buildRes.network);
      let finalXdr = buildRes.xdr;
      let finalSigner = creator;

      if (currentPk !== creator) {
        console.warn('Account mismatch detected, rebuilding XDR for current account:', currentPk);
        // Rebuild with current account
        const rebuildRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: currentPk,
            recipient: finalRecipient,
            asset: ASSETS[asset as keyof typeof ASSETS],
            amount,
            denom: 'USD',
            expiry_secs: Math.floor(effectiveExpiryHours * 3600),
          }),
        }).then(r => r.json());

        if (!rebuildRes.ok || !rebuildRes.xdr) {
          throw new Error('Failed to rebuild transaction for current account');
        }

        finalXdr = rebuildRes.xdr;
        finalSigner = currentPk;
      }

      // Show waiting modal and attempt signing
      setWaitingForFreighter(true);
      setFreighterAction({ type: 'create', xdr: finalXdr, network: buildRes.network });
      setIsRetrying(true);
      setLastSignError('');
      addToast('Transaction built, please sign in Freighter...', 'info');

      // Sign with Freighter
      const signedXdr = await signXdrWithFreighter(finalXdr, buildRes.network);
      if (!signedXdr || typeof signedXdr !== 'string') {
        throw new Error('Missing signed XDR from wallet');
      }

      // Submit signed transaction
      const submitRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xdr: signedXdr,
          signer: finalSigner,
          metadata: {
            creator: finalSigner,
            recipient: finalRecipient,
            asset: ASSETS[asset as keyof typeof ASSETS],
            amount,
            denom: 'USD',
            expiry_secs: Math.floor(effectiveExpiryHours * 3600)
          }
        }),
      }).then(r => r.json());

      if (!submitRes.ok) {
        throw new Error(submitRes.error || 'Failed to submit transaction');
      }

      setLastTxHash(submitRes.hash);
      setLastEnvelopeId(String(submitRes.result));
      setEnvelopeId(String(submitRes.result)); // Pre-fill for opening
      setRefundEnvelopeId(String(submitRes.result)); // Pre-fill for refund

      // Set expiry time for countdown
      if (effectiveExpiryHours > 0) {
        const expiryTimestamp = Math.floor(Date.now() / 1000) + Math.floor(effectiveExpiryHours * 3600);
        setEnvelopeExpiryTime(expiryTimestamp);
      }

      addToast(`Envelope #${submitRes.result} created successfully!`, 'success');

      // Refresh balances after create
      await checkBalances();
      setWaitingForFreighter(false);
      setFreighterAction(null);
      setIsRetrying(false);
      setLastSignError('');
    } catch (error: any) {
      console.error('Create error:', error);
      addToast(error.message || 'Failed to create envelope', 'error');
      setIsRetrying(false);
      if (waitingForFreighter) {
        setLastSignError(error.message || 'Transaction signing failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function openEnvelope() {
    setLoading(true);
    setOpenResult(null);

    try {
      if (!envelopeId) {
        throw new Error('Envelope ID required');
      }

      const opener = await ensureFreighter();

      // Build open transaction
      const buildRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: envelopeId,
          recipient: opener,
        }),
      }).then(r => r.json());

      if (!buildRes.ok) {
        const errorMsg = buildRes.message
          ? `${buildRes.error || 'Failed to build claim transaction'}: ${buildRes.message}`
          : buildRes.error || 'Failed to build claim transaction';
        throw new Error(errorMsg);
      }
      if (!buildRes.xdr || typeof buildRes.xdr !== 'string') {
        throw new Error('Server did not return XDR (claim build failed)');
      }

      // Check if we should use mobile signing
      if (!hasFreighterExtension || isMobile) {
        addToast('Please sign using Freighter Mobile', 'info');
        setPendingXdr({ xdr: buildRes.xdr, network: buildRes.network, type: 'open' });
        setShowMobileSign(true);
        setLoading(false);
        return;
      }

      // Pre-sign guard: Check if account changed and rebuild if necessary
      const currentPk = await ensureFreighter(buildRes.network);
      let finalXdr = buildRes.xdr;
      let finalSigner = opener;

      if (currentPk !== opener) {
        console.warn('Account mismatch detected, rebuilding XDR for current account:', currentPk);
        // Rebuild with current account
        const rebuildRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: envelopeId,
            recipient: currentPk,
          }),
        }).then(r => r.json());

        if (!rebuildRes.ok || !rebuildRes.xdr) {
          throw new Error('Failed to rebuild transaction for current account');
        }

        finalXdr = rebuildRes.xdr;
        finalSigner = currentPk;
      }

      // Show waiting modal and attempt signing
      setWaitingForFreighter(true);
      setFreighterAction({ type: 'open', xdr: finalXdr, network: buildRes.network });
      setIsRetrying(true);
      setLastSignError('');
      addToast('Transaction built, please sign in Freighter...', 'info');

      // Sign with Freighter
      const signedXdr = await signXdrWithFreighter(finalXdr, buildRes.network);
      if (!signedXdr || typeof signedXdr !== 'string') {
        throw new Error('Missing signed XDR from wallet');
      }

      // Submit signed transaction
      const submitRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xdr: signedXdr,
          signer: finalSigner
        }),
      }).then(r => r.json());

      if (!submitRes.ok) {
        throw new Error(submitRes.error || 'Failed to submit transaction');
      }

      setOpenResult({
        hash: submitRes.hash,
        amount: submitRes.result,
        ledger: submitRes.ledger,
      });

      addToast(`Envelope opened! Amount: ${submitRes.result}`, 'success');
      setWaitingForFreighter(false);
      setFreighterAction(null);
      setIsRetrying(false);
      setLastSignError('');
    } catch (error: any) {
      console.error('Open error:', error);
      addToast(error.message || 'Failed to open envelope', 'error');
      setIsRetrying(false);
      if (waitingForFreighter) {
        setLastSignError(error.message || 'Transaction signing failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Refund envelope after expiry
  async function refundEnvelope() {
    setLoading(true);
    setRefundResult(null);

    try {
      if (!refundEnvelopeId) {
        throw new Error('Envelope ID required');
      }

      const creator = await ensureFreighter();

      // Build refund transaction
      const buildRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: refundEnvelopeId,
          creator,
        }),
      }).then(r => r.json());

      if (!buildRes.ok) {
        // Map common contract errors to friendly messages
        const errorMsg = buildRes.error || 'Failed to build refund transaction';
        if (errorMsg.includes('Envelope expired') || errorMsg.includes('not expired')) {
          throw new Error('Too early: wait until the expiry time');
        } else if (errorMsg.includes('already opened') || errorMsg.includes('Already opened')) {
          throw new Error('This envelope was already opened');
        } else if (errorMsg.includes('Not the recipient') || errorMsg.includes('Not the creator')) {
          throw new Error('Refund must be performed by the creator');
        }
        throw new Error(errorMsg);
      }

      addToast('Transaction built, please sign in Freighter...', 'info');

      // Sign with Freighter
      const signedXdr = await signXdrWithFreighter(buildRes.xdr, buildRes.network);

      if (!signedXdr || typeof signedXdr !== 'string') {
        throw new Error('Missing signed XDR from wallet');
      }

      // Submit signed transaction
      const submitRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xdr: signedXdr,
          signer: creator
        }),
      }).then(r => r.json());

      if (!submitRes.ok) {
        throw new Error(submitRes.error || 'Failed to submit transaction');
      }

      setRefundResult({
        hash: submitRes.hash,
        ledger: submitRes.ledger,
      });

      addToast(`Envelope #${refundEnvelopeId} refunded successfully!`, 'success');

      // Refresh balances after refund
      await checkBalances();
    } catch (error: any) {
      console.error('Refund error:', error);
      addToast(error.message || 'Failed to refund envelope', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Check balances for creator and optional recipient
  async function checkBalances() {
    if (!walletPk) return;

    setCheckingBalances(true);
    try {
      const addresses = [walletPk];
      if (recipientForBalance && recipientForBalance !== walletPk) {
        addresses.push(recipientForBalance);
      }

      const newBalances: typeof balances = {
        creator: { xlm: '0', wxlm: '0' },
        recipient: { xlm: '0', wxlm: '0' }
      };

      for (const [idx, address] of addresses.entries()) {
        const isCreator = idx === 0;

        // Get native XLM balance from Horizon
        try {
          const accountRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
          if (accountRes.ok) {
            const account = await accountRes.json();
            const xlmBalance = account.balances?.find((b: any) => b.asset_type === 'native');
            if (xlmBalance) {
              if (isCreator) {
                newBalances.creator.xlm = xlmBalance.balance;
              } else {
                newBalances.recipient.xlm = xlmBalance.balance;
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch XLM balance:', e);
        }

        // Get WXLM token balance - simplified for now
        // TODO: Fix Stellar SDK import issues for proper balance checking
        try {
          // For dev/testing, just show placeholder
          if (isCreator) {
            newBalances.creator.wxlm = '---';
          } else {
            newBalances.recipient.wxlm = '---';
          }
        } catch (e) {
          console.error('Failed to fetch WXLM balance:', e);
        }
      }

      setBalances(newBalances);
    } catch (error) {
      console.error('Balance check error:', error);
    } finally {
      setCheckingBalances(false);
    }
  }

  // Format countdown timer
  function formatCountdown(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      {/* Status bar */}
      <div className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center gap-3">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${walletConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          Wallet: {walletConnected ? `Connected (${formatAddress(walletPk)})` : 'Not connected'}
        </div>
        {(!walletConnected) && (
          <button onClick={onConnectWallet} className="px-3 py-1 rounded-full text-xs bg-purple-600 text-white hover:bg-purple-700">Connect Wallet</button>
        )}
        {walletErr && <span className="text-xs text-red-600">{walletErr}</span>}
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${oracleFresh ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          Oracle: {oracleFresh === null ? 'Unknown' : oracleFresh ? `Fresh (${oracleAge ?? 0}s ago)` : `Stale (${oracleAge ?? '?'}s)`}
        </div>
      </div>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Envelope Contract Test
          </h1>
          <p className="text-gray-600 mt-2">
            Contract: {backendContractId || 'Loading...'}
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="font-semibold mb-3 text-gray-800">Test Settings</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useTestnet}
                onChange={(e) => setUseTestnet(e.target.checked)}
                disabled
              />
              <span className="text-gray-700">Use Testnet</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoFillRecipient}
                onChange={(e) => setAutoFillRecipient(e.target.checked)}
              />
              <span className="text-gray-700">Auto-fill recipient with creator</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={quickCreateMode}
                onChange={(e) => setQuickCreateMode(e.target.checked)}
              />
              <span className="text-gray-700">Quick mode (1-minute expiry)</span>
            </label>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('create')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === 'create'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Create Envelope
          </button>
          <button
            onClick={() => setTab('open')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === 'open'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Open Envelope
          </button>
          <button
            onClick={() => setTab('refund')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === 'refund'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Refund Envelope
          </button>
        </div>

        {/* Create Tab */}
        {tab === 'create' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Create New Envelope</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={autoFillRecipient ? "Leave empty to send to yourself" : "G..."}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a Stellar account (G…); do not paste contract IDs (C…). Enable auto-fill to send to yourself.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.1"
                    min="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset
                  </label>
                  <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  >
                    <option value="XLM">Wrapped XLM</option>
                    <option value="USDC">Test USDC</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry (hours)
                </label>
                <input
                  type="number"
                  value={expiryHours}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setExpiryHours(isNaN(val) ? 1 : val);
                  }}
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
              </div>

              <button
                onClick={asset === 'USDC' && needsUsdcTrustline ? createUsdcTrustline : createEnvelope}
                disabled={loading || !walletConnected || checkingTrustline || creatingTrustline}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {creatingTrustline
                  ? 'Creating Trustline...'
                  : checkingTrustline
                  ? 'Checking Trustline...'
                  : loading
                  ? 'Processing...'
                  : asset === 'USDC' && needsUsdcTrustline
                  ? 'Create USDC Trustline'
                  : 'Create Envelope'}
              </button>

              {quickCreateMode && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">Quick Mode Active</p>
                  <p className="text-xs text-yellow-600 mt-1">Envelope will expire in 1 minute after creation</p>
                </div>
              )}

              {lastEnvelopeId && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Success!</p>
                  <p className="text-xs text-green-600 mt-1">Envelope ID: {lastEnvelopeId}</p>
                  {envelopeExpiryTime > 0 && refundCountdown > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-700">Refund available in: {formatCountdown(refundCountdown)}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${(60 - refundCountdown) / 60 * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {lastTxHash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 block"
                    >
                      View on Stellar Expert →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Open Tab */}
        {tab === 'open' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Open Envelope</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Envelope ID
                </label>
                <input
                  type="text"
                  value={envelopeId}
                  onChange={(e) => setEnvelopeId(e.target.value)}
                  placeholder="Enter envelope ID (e.g., 1)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the numeric ID of the envelope you want to open
                </p>
              </div>

              <button
                onClick={openEnvelope}
                disabled={loading || !envelopeId || !walletConnected}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Processing...' : 'Open Envelope'}
              </button>

              {openResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Envelope Opened!</p>
                  <p className="text-xs text-green-600 mt-1">
                    Amount received: {openResult.amount}
                  </p>
                  <p className="text-xs text-green-600">
                    Ledger: {openResult.ledger}
                  </p>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${openResult.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 block"
                  >
                    View on Stellar Expert →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Refund Tab */}
        {tab === 'refund' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Refund Envelope</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Envelope ID
                </label>
                <input
                  type="text"
                  value={refundEnvelopeId}
                  onChange={(e) => setRefundEnvelopeId(e.target.value)}
                  placeholder="Enter envelope ID (e.g., 1)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the ID of the expired envelope you created
                </p>
              </div>

              {refundCountdown > 0 && envelopeExpiryTime > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    Refund available in: {formatCountdown(refundCountdown)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(0, (60 - refundCountdown) / 60 * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={refundEnvelope}
                disabled={loading || !refundEnvelopeId || !walletConnected || (refundCountdown > 0)}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Processing...' : refundCountdown > 0 ? `Wait ${formatCountdown(refundCountdown)}` : 'Refund Envelope'}
              </button>

              {refundResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">Refund Successful!</p>
                  <p className="text-xs text-green-600 mt-1">
                    Funds have been returned to the creator
                  </p>
                  <p className="text-xs text-green-600">
                    Ledger: {refundResult.ledger}
                  </p>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${refundResult.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 block"
                  >
                    View on Stellar Expert →
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Balance Panel (Dev Only) */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Balance Panel</h3>
            <button
              onClick={checkBalances}
              disabled={checkingBalances || !walletConnected}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 text-sm"
            >
              {checkingBalances ? 'Checking...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-3">
            {/* Creator balances */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Creator ({formatAddress(walletPk)})</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">XLM</p>
                  <p className="text-sm font-mono">{balances.creator.xlm}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">WXLM</p>
                  <p className="text-sm font-mono">{balances.creator.wxlm}</p>
                </div>
              </div>
            </div>

            {/* Recipient balance check */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check Recipient Balance (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientForBalance}
                  onChange={(e) => setRecipientForBalance(e.target.value)}
                  placeholder="G..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              {recipientForBalance && recipientForBalance !== walletPk && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-600">XLM</p>
                    <p className="text-sm font-mono">{balances.recipient.xlm}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-600">WXLM</p>
                    <p className="text-sm font-mono">{balances.recipient.wxlm}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sign Dialog */}
      {showMobileSign && pendingXdr && (
        <MobileSignDialog
          xdr={pendingXdr.xdr}
          networkPassphrase={pendingXdr.network}
          publicKey={walletPk}
          onClose={() => {
            setShowMobileSign(false);
            setPendingXdr(null);
          }}
          onSuccess={() => {
            addToast('Transaction signed! Check your wallet for confirmation.', 'success');
          }}
        />
      )}

      {/* Mobile/No Extension Notice */}
      {(isMobile || !hasFreighterExtension) && !showMobileSign && (
        <div className="max-w-3xl mx-auto mt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              {isMobile
                ? '📱 You\'re on a mobile device. Transactions will open in Freighter Mobile app.'
                : '⚠️ Freighter extension not detected. You can sign transactions using Freighter Mobile via QR code.'}
            </p>
          </div>
        </div>
      )}

      {/* Waiting for Freighter Modal */}
      {waitingForFreighter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Waiting for Freighter...</h3>

            <div className="mb-6">
              <div className="animate-pulse bg-purple-100 rounded-lg p-4 mb-4">
                <div className="h-2 bg-purple-400 rounded animate-pulse"></div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p>👉 If you don't see a prompt, open Freighter and approve the transaction</p>
                <p>🌐 Ensure Freighter is set to <strong>Testnet</strong></p>
                {!walletConnected && (
                  <p>🔐 Grant this site permission in Freighter if prompted</p>
                )}
              </div>

              {/* Inline error display */}
              {lastSignError && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {lastSignError}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={retryFreighterSign}
                disabled={isRetrying}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  isRetrying
                    ? 'bg-purple-400 text-white cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isRetrying ? 'Retrying...' : 'Retry Sign'}
              </button>
              <button
                onClick={() => {
                  setWaitingForFreighter(false);
                  setFreighterAction(null);
                  setLoading(false);
                  setIsRetrying(false);
                  setLastSignError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
