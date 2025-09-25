import React, { useCallback, useMemo, useState, useRef } from 'react';
import { config } from '@/config';
import * as freighterApi from '@/lib/freighter-direct';
import { XLM_CONTRACT_ID } from '@/config/stellar';
import { toast } from 'sonner';

const NET = 'Test SDF Network ; September 2015';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}

type Msg = { ts: string; level: 'info' | 'warn' | 'error' | 'success'; text: string; data?: unknown };

interface EnvironmentInfo {
  browser: string;
  userAgent: string;
  platform?: string;
  siteOrigin: string;
  timestamp: string;
  freighterApiAvailable: boolean;
}

export default function FreighterDiagnostics() {
  const [logs, setLogs] = useState<Msg[]>([]);
  const [publicKey, setPublicKey] = useState<string>('');
  const [network, setNetwork] = useState<string>('');
  const [classicXdr, setClassicXdr] = useState<string>('');
  const [soroXdr, setSoroXdr] = useState<string>('');
  const [soroInspect, setSoroInspect] = useState<{
    prepared: boolean;
    envelopeType: string;
    ops: Array<{ type: string; index: number }>;
  } | null>(null);
  const [asset, setAsset] = useState<string>(XLM_CONTRACT_ID); // WXLM (testnet)
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);

  // Automated scenario state
  const [scenarioRunning, setScenarioRunning] = useState<string | null>(null);
  const [scenarioAmount, setScenarioAmount] = useState<string>('5');
  const [scenarioAsset] = useState<string>(XLM_CONTRACT_ID);
  const [scenarioExpiry, setScenarioExpiry] = useState<number>(60);
  const [scenarioRepeat, setScenarioRepeat] = useState<number>(1);
  const abortRef = useRef<boolean>(false);
  const [scenarioLogs, setScenarioLogs] = useState<Array<{
    timestamp: string;
    step: string;
    status: 'pending' | 'success' | 'error' | 'skipped';
    message: string;
    hash?: string;
    explorerUrl?: string;
    elapsed?: number;
    fee?: string;
    iteration?: number;
  }>>([]);
  const [countdown, setCountdown] = useState<number>(0);
  const [balances, setBalances] = useState<{
    before: { xlm: string; wxlm: string };
    after: { xlm: string; wxlm: string };
  }>({
    before: { xlm: '0', wxlm: '0' },
    after: { xlm: '0', wxlm: '0' }
  });

  // Enhanced stats with per-iteration tracking
  const [scenarioStats, setScenarioStats] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    avgTimeMs: number;
    p95TimeMs: number;
    avgSignTimeMs: number;
    p95SignTimeMs: number;
    iterations: Array<{
      index: number;
      success: boolean;
      totalTimeMs: number;
      signTimeMs: number;
      fees: string[];
      error?: string;
    }>;
  }>({
    total: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    avgTimeMs: 0,
    p95TimeMs: 0,
    avgSignTimeMs: 0,
    p95SignTimeMs: 0,
    iterations: []
  });

  const addLog = useCallback((level: Msg['level'], text: string, data?: unknown) => {
    setLogs((prev) => [{ ts: new Date().toLocaleTimeString(), level, text, data }, ...prev].slice(0, 200));
  }, []);

  // Utility to safely render strings in the UI without risking object children
  const toDisplay = useCallback((value: unknown, fallback = '—') => {
    return typeof value === 'string' && value ? value : fallback;
  }, []);

  // Capture environment info
  const captureEnvironment = useCallback(() => {
    const env: EnvironmentInfo = {
      browser: navigator.vendor,
      userAgent: navigator.userAgent,
      platform: (navigator as any).userAgentData?.platform || navigator.platform,
      siteOrigin: window.location.origin,
      timestamp: new Date().toISOString(),
      freighterApiAvailable: !!(window as any).freighterApi
    };
    setEnvironment(env);
    addLog('info', 'Environment captured', env);
    return env;
  }, [addLog]);

  // Countdown timer effect
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redact address for PII safety
  const redactAddress = (addr: string): string => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  };

  // Add scenario log entry
  const addScenarioLog = (step: string, status: 'pending' | 'success' | 'error' | 'skipped', message: string, extras?: {
    hash?: string;
    elapsed?: number;
    fee?: string;
    iteration?: number;
  }) => {
    const log = {
      timestamp: new Date().toISOString(),
      step,
      status,
      message,
      hash: extras?.hash,
      explorerUrl: extras?.hash ? `https://stellar.expert/explorer/testnet/tx/${extras.hash}` : undefined,
      elapsed: extras?.elapsed,
      fee: extras?.fee,
      iteration: extras?.iteration
    };
    setScenarioLogs(prev => [...prev, log]);
    addLog(
      status === 'error' ? 'error' : status === 'success' ? 'success' : 'info',
      `[${step}]${extras?.iteration !== undefined ? ` [Run ${extras.iteration}]` : ''} ${message}${extras?.fee ? ` Fee: ${extras.fee}` : ''}`
    );
  };

  // Calculate percentile
  const calculateP95 = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[index] || 0;
  };

  // Format fee from stroops to XLM
  const formatFee = (stroops: string | number): string => {
    const xlm = Number(stroops) / 10000000;
    return `${xlm.toFixed(7)} XLM`;
  };

  // Copy text to clipboard
  const copyToClipboard = async (text: string, label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label ? `${label} copied` : 'Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Stop running scenario
  const stopScenario = () => {
    abortRef.current = true;
    addScenarioLog('abort', 'error', 'Scenario stopped by user');
  };

  // Check balances
  const checkBalances = async (address: string): Promise<{ xlm: string; wxlm: string }> => {
    try {
      // Get native XLM balance
      const accountRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
      if (!accountRes.ok) {
        return { xlm: '0', wxlm: '0' };
      }
      const account = await accountRes.json();
      const xlmBalance = account.balances?.find((b: any) => b.asset_type === 'native');

      // For WXLM, we'd need Soroban SDK - simplified for now
      return {
        xlm: xlmBalance?.balance || '0',
        wxlm: '---' // Placeholder - would need proper Soroban call
      };
    } catch (error) {
      console.error('Balance check error:', error);
      return { xlm: '0', wxlm: '0' };
    }
  };

  const freighterGlobal = useMemo(() => {
    if (typeof window !== 'undefined' && window.freighterApi) {
      return window.freighterApi as { signTransaction?: Function };
    }
    return undefined;
  }, []);

  // Use official API for handshake
  const runHandshake = useCallback(async () => {
    try {
      // Check if connected
      const connStatus = await freighterApi.isConnected();
      addLog('info', 'Connection status', connStatus);

      // Request access
      const accessResult = await freighterApi.requestAccess();
      if (accessResult.error) {
        addLog('error', 'Access request failed', accessResult.error);
      } else {
        addLog('info', 'Access granted', accessResult);
      }

      // Get address
      const addressResult = await freighterApi.getAddress();
      if (addressResult.error) {
        addLog('error', 'Failed to get address', addressResult.error);
      } else {
        setPublicKey(addressResult.address || '');
        addLog('success', 'Public key', { publicKey: addressResult.address });
      }

      // Get network details
      const networkResult = await freighterApi.getNetworkDetails();
      if (networkResult.error) {
        addLog('error', 'Failed to get network details', networkResult.error);
      } else {
        setNetwork(networkResult.networkPassphrase || '');
        addLog('success', 'Network details', networkResult);
      }
    } catch (e: unknown) {
      addLog('error', 'Handshake failed', e);
    }
  }, [addLog]);

  const buildClassic = useCallback(async () => {
    try {
      if (!publicKey) throw new Error('Run handshake to get public key');
      const r = await fetch(`${config.api.baseUrl}/api/tools/classic-payment/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: publicKey })
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`classic build http ${r.status}: ${t}`);
      }
      const j = await r.json().catch(() => { throw new Error('classic build: invalid JSON'); });
      if (!j.ok) throw new Error(j.error || 'classic build failed');
      setClassicXdr(j.xdr);
      addLog('success', 'Classic XDR built');
    } catch (e: unknown) {
      addLog('error', 'Classic build failed', e);
    }
  }, [publicKey, addLog]);

  const buildSoroban = useCallback(async () => {
    try {
      if (!publicKey) throw new Error('Run handshake to get public key');
      // Create payload with asset contract ID
      const payload = {
        creator: publicKey,
        recipient: publicKey,
        asset,
        amount: '5',
        denom: 'USD',
        expiry_secs: 7200
      };
      const r = await fetch(`${config.api.baseUrl}/api/envelope-mvp/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`soroban build http ${r.status}: ${t}`);
      }
      const j = await r.json().catch(() => { throw new Error('soroban build: invalid JSON'); });
      if (!j.ok) throw new Error(j.error || 'soroban build failed');
      setSoroXdr(j.xdr);
      addLog('success', 'Soroban XDR built');

      // Inspect
      const ir = await fetch(`${config.api.baseUrl}/api/tools/xdr/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xdr: j.xdr, network: NET })
      });
      if (!ir.ok) {
        const t = await ir.text().catch(() => '');
        throw new Error(`inspect http ${ir.status}: ${t}`);
      }
      const insp = await ir.json().catch(() => { throw new Error('inspect: invalid JSON'); });
      setSoroInspect(insp);
      addLog('info', 'Soroban inspect', insp);
    } catch (e: unknown) {
      addLog('error', 'Soroban build/inspect failed', e);
    }
  }, [publicKey, asset, addLog]);

  // Test signing using global API directly
  const testGlobalSign = useCallback(async (xdr: string) => {
    try {
      const pk = publicKey || (await freighterApi.getAddress()).address;
      const fa = freighterGlobal?.signTransaction;
      if (typeof fa !== 'function') throw new Error('window.freighterApi.signTransaction not available');

      const res = await fa(xdr, {
        networkPassphrase: NET,
        accountToSign: pk,
        address: pk
      });

      addLog('success', 'Global API sign success', res);
    } catch (e: unknown) {
      addLog('error', 'Global API sign failed', e);
    }
  }, [addLog, freighterGlobal, publicKey]);

  // Scenario: Create → Refund (after expiry)
  const runCreateRefundScenario = async () => {
    abortRef.current = false;
    setScenarioRunning('create-refund');
    setScenarioLogs([]);
    setScenarioStats({
      total: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      avgTimeMs: 0,
      p95TimeMs: 0,
      avgSignTimeMs: 0,
      p95SignTimeMs: 0,
      iterations: []
    });

    for (let iteration = 1; iteration <= scenarioRepeat; iteration++) {
      if (abortRef.current) {
        addScenarioLog('iteration', 'skipped', `Run ${iteration} skipped (aborted)`, { iteration });
        setScenarioStats(prev => ({ ...prev, total: prev.total + 1, skipped: prev.skipped + 1 }));
        continue;
      }

      const iterationStart = Date.now();
      const fees: string[] = [];
      let signTimeMs = 0;

      try {
        addScenarioLog('iteration', 'pending', `Starting run ${iteration}/${scenarioRepeat}`, { iteration });
        // Step 1: Handshake and get address
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('handshake', 'pending', 'Ensuring Freighter connection...', { iteration });
        const addressResult = await freighterApi.getAddress();
        if (!addressResult.address) throw new Error('Failed to get address');

        const address = addressResult.address;
        addScenarioLog('handshake', 'success', `Connected: ${redactAddress(address)}`, {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Check initial balances
        const beforeBalances = await checkBalances(address);
        if (iteration === 1) {
          setBalances(prev => ({ ...prev, before: beforeBalances }));
        }

        // Step 2: Build create transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create-build', 'pending', 'Building create envelope transaction...', { iteration });
        const createRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator: address,
          recipient: address,
          asset: scenarioAsset,
          amount: scenarioAmount,
          denom: 'USD',
          expiry_secs: scenarioExpiry,
        }),
      }).then(r => r.json());

        if (!createRes.ok) throw new Error(createRes.error || 'Failed to build create transaction');
        addScenarioLog('create-build', 'success', 'Create transaction built', {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Step 3: Sign create transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create-sign', 'pending', 'Please sign in Freighter...', { iteration });
        const signStart = Date.now();
        const signedCreateXdr = await freighterApi.signTransaction(createRes.xdr, { networkPassphrase: createRes.network });
        signTimeMs += Date.now() - signStart;
        if (!signedCreateXdr || signedCreateXdr.error) throw new Error('Failed to sign create transaction');
        addScenarioLog('create-sign', 'success', 'Create transaction signed', {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Step 4: Submit create transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create-submit', 'pending', 'Submitting create transaction...', { iteration });
        const submitCreateRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            xdr: signedCreateXdr.signedTxXdr || signedCreateXdr,
            signer: address,
            metadata: {
              creator: address,
              recipient: address,
              asset: scenarioAsset,
              amount: scenarioAmount,
              denom: 'USD',
              expiry_secs: scenarioExpiry
            }
          }),
        }).then(r => r.json());

        if (!submitCreateRes.ok) throw new Error(submitCreateRes.error || 'Failed to submit create transaction');
        const envelopeId = submitCreateRes.result;

        // Extract fee if available
        const createFee = submitCreateRes.feeCharged ? formatFee(submitCreateRes.feeCharged) : undefined;
        if (createFee) fees.push(createFee);

        addScenarioLog('create-submit', 'success', `Envelope #${envelopeId} created`, {
          hash: submitCreateRes.hash,
          elapsed: Date.now() - iterationStart,
          fee: createFee,
          iteration
        });

        // Step 5: Wait for expiry
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('wait', 'pending', `Waiting ${scenarioExpiry}s for expiry...`, { iteration });
        setCountdown(scenarioExpiry);

        // Wait with abort checking
        for (let i = 0; i < scenarioExpiry; i++) {
          if (abortRef.current) {
            setCountdown(0);
            throw new Error('Aborted by user');
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          setCountdown(scenarioExpiry - i - 1);
        }

        setCountdown(0);
        addScenarioLog('wait', 'success', 'Expiry time reached', {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Step 6: Build refund transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('refund-build', 'pending', 'Building refund transaction...', { iteration });
        const refundRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/refund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: envelopeId,
            creator: address,
          }),
        }).then(r => r.json());

        if (!refundRes.ok) throw new Error(refundRes.error || 'Failed to build refund transaction');
        addScenarioLog('refund-build', 'success', 'Refund transaction built', {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Step 7: Sign refund transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('refund-sign', 'pending', 'Please sign refund in Freighter...', { iteration });
        const refundSignStart = Date.now();
        const signedRefundXdr = await freighterApi.signTransaction(refundRes.xdr, { networkPassphrase: refundRes.network });
        signTimeMs += Date.now() - refundSignStart;
        if (!signedRefundXdr || signedRefundXdr.error) throw new Error('Failed to sign refund transaction');
        addScenarioLog('refund-sign', 'success', 'Refund transaction signed', {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Step 8: Submit refund transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('refund-submit', 'pending', 'Submitting refund transaction...', { iteration });
        const submitRefundRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            xdr: signedRefundXdr.signedTxXdr || signedRefundXdr,
            signer: address
          }),
        }).then(r => r.json());

        if (!submitRefundRes.ok) throw new Error(submitRefundRes.error || 'Failed to submit refund transaction');

        // Extract fee if available
        const refundFee = submitRefundRes.feeCharged ? formatFee(submitRefundRes.feeCharged) : undefined;
        if (refundFee) fees.push(refundFee);

        addScenarioLog('refund-submit', 'success', `Envelope #${envelopeId} refunded`, {
          hash: submitRefundRes.hash,
          elapsed: Date.now() - iterationStart,
          fee: refundFee,
          iteration
        });

        // Check final balances
        const afterBalances = await checkBalances(address);
        if (iteration === scenarioRepeat || abortRef.current) {
          setBalances(prev => ({ ...prev, after: afterBalances }));
        }

        // Track iteration success
        const totalTimeMs = Date.now() - iterationStart;
        setScenarioStats(prev => {
          const newIteration = {
            index: iteration,
            success: true,
            totalTimeMs,
            signTimeMs,
            fees,
            error: undefined
          };
          const iterations = [...prev.iterations, newIteration];
          const times = iterations.map(i => i.totalTimeMs);
          const signTimes = iterations.map(i => i.signTimeMs);

          return {
            ...prev,
            total: prev.total + 1,
            succeeded: prev.succeeded + 1,
            iterations,
            avgTimeMs: times.reduce((a, b) => a + b, 0) / times.length,
            p95TimeMs: calculateP95(times),
            avgSignTimeMs: signTimes.reduce((a, b) => a + b, 0) / signTimes.length,
            p95SignTimeMs: calculateP95(signTimes)
          };
        });

        addScenarioLog('iteration', 'success', `Run ${iteration} completed`, {
          iteration,
          elapsed: totalTimeMs
        });

      } catch (error: any) {
        const errorMsg = error.message || 'Scenario failed';
        addScenarioLog('error', 'error', errorMsg, { iteration });

        setScenarioStats(prev => {
          const newIteration = {
            index: iteration,
            success: false,
            totalTimeMs: Date.now() - iterationStart,
            signTimeMs,
            fees,
            error: errorMsg
          };
          const iterations = [...prev.iterations, newIteration];

          return {
            ...prev,
            total: prev.total + 1,
            failed: prev.failed + 1,
            iterations
          };
        });
      }
    }

    setScenarioRunning(null);
    setCountdown(0);
  };

  // Scenario: Create → Open (self)
  const runCreateOpenScenario = async () => {
    abortRef.current = false;
    setScenarioRunning('create-open');
    setScenarioLogs([]);
    setScenarioStats({
      total: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      avgTimeMs: 0,
      p95TimeMs: 0,
      avgSignTimeMs: 0,
      p95SignTimeMs: 0,
      iterations: []
    });

    for (let iteration = 1; iteration <= scenarioRepeat; iteration++) {
      if (abortRef.current) {
        addScenarioLog('iteration', 'skipped', `Run ${iteration} skipped (aborted)`, { iteration });
        setScenarioStats(prev => ({ ...prev, total: prev.total + 1, skipped: prev.skipped + 1 }));
        continue;
      }

      const iterationStart = Date.now();
      const fees: string[] = [];
      let signTimeMs = 0;

      try {
        addScenarioLog('iteration', 'pending', `Starting run ${iteration}/${scenarioRepeat}`, { iteration });

        // Step 1: Handshake
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('handshake', 'pending', 'Ensuring Freighter connection...', { iteration });
        const addressResult = await freighterApi.getAddress();
        if (!addressResult.address) throw new Error('Failed to get address');

        const address = addressResult.address;
        addScenarioLog('handshake', 'success', `Connected: ${redactAddress(address)}`, {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Check initial balances
        const beforeBalances = await checkBalances(address);
        if (iteration === 1) {
          setBalances(prev => ({ ...prev, before: beforeBalances }));
        }

        // Step 2: Create envelope
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create', 'pending', 'Creating envelope...', { iteration });
        const createRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: address,
            recipient: address,
            asset: scenarioAsset,
            amount: scenarioAmount,
            denom: 'USD',
            expiry_secs: 0, // No expiry for immediate open
          }),
        }).then(r => r.json());

        if (!createRes.ok) throw new Error(createRes.error || 'Failed to build create transaction');

        // Sign create transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create-sign', 'pending', 'Please sign in Freighter...', { iteration });
        const signStart = Date.now();
        const signedCreateXdr = await freighterApi.signTransaction(createRes.xdr, { networkPassphrase: createRes.network });
        signTimeMs += Date.now() - signStart;
        if (!signedCreateXdr || signedCreateXdr.error) throw new Error('Failed to sign create transaction');
        addScenarioLog('create-sign', 'success', 'Create transaction signed', {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Submit create transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create-submit', 'pending', 'Submitting create transaction...', { iteration });
        const submitCreateRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            xdr: signedCreateXdr.signedTxXdr || signedCreateXdr,
            signer: address,
            metadata: {
              creator: address,
              recipient: address,
              asset: scenarioAsset,
              amount: scenarioAmount,
              denom: 'USD',
              expiry_secs: scenarioExpiry
            }
          }),
        }).then(r => r.json());

        if (!submitCreateRes.ok) throw new Error(submitCreateRes.error || 'Failed to submit create transaction');
        const envelopeId = submitCreateRes.result;

        // Extract fee if available
        const createFee = submitCreateRes.feeCharged ? formatFee(submitCreateRes.feeCharged) : undefined;
        if (createFee) fees.push(createFee);

        addScenarioLog('create-submit', 'success', `Envelope #${envelopeId} created`, {
          hash: submitCreateRes.hash,
          elapsed: Date.now() - iterationStart,
          fee: createFee,
          iteration
        });

        // Step 3: Open envelope
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('open', 'pending', 'Opening envelope...', { iteration });
        const openRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: envelopeId,
            recipient: address,
          }),
        }).then(r => r.json());

        if (!openRes.ok) throw new Error(openRes.error || 'Failed to build open transaction');

        // Sign open transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('open-sign', 'pending', 'Please sign open transaction in Freighter...', { iteration });
        const openSignStart = Date.now();
        const signedOpenXdr = await freighterApi.signTransaction(openRes.xdr, { networkPassphrase: openRes.network });
        signTimeMs += Date.now() - openSignStart;
        if (!signedOpenXdr || signedOpenXdr.error) throw new Error('Failed to sign open transaction');
        addScenarioLog('open-sign', 'success', 'Open transaction signed', {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Submit open transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('open-submit', 'pending', 'Submitting open transaction...', { iteration });
        const submitOpenRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            xdr: signedOpenXdr.signedTxXdr || signedOpenXdr,
            signer: address
          }),
        }).then(r => r.json());

        if (!submitOpenRes.ok) throw new Error(submitOpenRes.error || 'Failed to submit open transaction');

        // Extract fee if available
        const openFee = submitOpenRes.feeCharged ? formatFee(submitOpenRes.feeCharged) : undefined;
        if (openFee) fees.push(openFee);

        addScenarioLog('open-submit', 'success', `Envelope opened! Amount: ${submitOpenRes.result}`, {
          hash: submitOpenRes.hash,
          elapsed: Date.now() - iterationStart,
          fee: openFee,
          iteration
        });

        // Check final balances
        const afterBalances = await checkBalances(address);
        if (iteration === scenarioRepeat || abortRef.current) {
          setBalances(prev => ({ ...prev, after: afterBalances }));
        }

        // Track iteration success
        const totalTimeMs = Date.now() - iterationStart;
        setScenarioStats(prev => {
          const newIteration = {
            index: iteration,
            success: true,
            totalTimeMs,
            signTimeMs,
            fees,
            error: undefined
          };
          const iterations = [...prev.iterations, newIteration];
          const times = iterations.map(i => i.totalTimeMs);
          const signTimes = iterations.map(i => i.signTimeMs);

          return {
            ...prev,
            total: prev.total + 1,
            succeeded: prev.succeeded + 1,
            iterations,
            avgTimeMs: times.reduce((a, b) => a + b, 0) / times.length,
            p95TimeMs: calculateP95(times),
            avgSignTimeMs: signTimes.reduce((a, b) => a + b, 0) / signTimes.length,
            p95SignTimeMs: calculateP95(signTimes)
          };
        });

        addScenarioLog('iteration', 'success', `Run ${iteration} completed`, {
          iteration,
          elapsed: totalTimeMs
        });

      } catch (error: any) {
        const errorMsg = error.message || 'Scenario failed';
        addScenarioLog('error', 'error', errorMsg, { iteration });

        setScenarioStats(prev => {
          const newIteration = {
            index: iteration,
            success: false,
            totalTimeMs: Date.now() - iterationStart,
            signTimeMs,
            fees,
            error: errorMsg
          };
          const iterations = [...prev.iterations, newIteration];

          return {
            ...prev,
            total: prev.total + 1,
            failed: prev.failed + 1,
            iterations
          };
        });
      }
    }

    setScenarioRunning(null);
  };

  // End-to-End MVP Flow: Create → Fund Page → Open/Claim
  const runEndToEndFlow = async () => {
    abortRef.current = false;
    setScenarioRunning('e2e-flow');
    setScenarioLogs([]);
    setScenarioStats({
      total: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      avgTimeMs: 0,
      p95TimeMs: 0,
      avgSignTimeMs: 0,
      p95SignTimeMs: 0,
      iterations: []
    });

    for (let iteration = 1; iteration <= scenarioRepeat; iteration++) {
      if (abortRef.current) {
        addScenarioLog('iteration', 'skipped', `Run ${iteration} skipped (aborted)`, { iteration });
        setScenarioStats(prev => ({ ...prev, total: prev.total + 1, skipped: prev.skipped + 1 }));
        continue;
      }

      const iterationStart = Date.now();
      const fees: string[] = [];
      let signTimeMs = 0;
      let envelopeId: string | null = null;

      try {
        addScenarioLog('iteration', 'pending', `Starting E2E run ${iteration}/${scenarioRepeat}`, { iteration });

        // Step 1: Handshake
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('handshake', 'pending', 'Ensuring Freighter connection...', { iteration });
        const addressResult = await freighterApi.getAddress();
        if (!addressResult.address) throw new Error('Failed to get address');

        const address = addressResult.address;
        addScenarioLog('handshake', 'success', `Connected: ${redactAddress(address)}`, {
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Check initial balances
        const beforeBalances = await checkBalances(address);
        if (iteration === 1) {
          setBalances(prev => ({ ...prev, before: beforeBalances }));
        }

        // Step 2: Create envelope (MVP style)
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create', 'pending', 'Creating MVP envelope...', { iteration });
        const createRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creator: address,
            recipient: address, // Self-send for testing
            asset: scenarioAsset,
            amount: scenarioAmount,
            denom: 'USD',
            expiry_secs: scenarioExpiry,
          }),
        }).then(r => r.json());

        if (!createRes.ok) throw new Error(createRes.error || 'Failed to build create transaction');

        // Sign create transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create-sign', 'pending', 'Please sign create transaction in Freighter...', { iteration });
        const signStart = Date.now();
        const signedCreateXdr = await freighterApi.signTransaction(createRes.xdr, { networkPassphrase: createRes.network });
        signTimeMs += Date.now() - signStart;
        if (!signedCreateXdr || signedCreateXdr.error) throw new Error('Failed to sign create transaction');

        // Submit create transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('create-submit', 'pending', 'Submitting create transaction...', { iteration });
        const submitCreateRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            xdr: signedCreateXdr.signedTxXdr || signedCreateXdr,
            signer: address,
            metadata: {
              creator: address,
              recipient: address,
              asset: scenarioAsset,
              amount: scenarioAmount,
              denom: 'USD',
              expiry_secs: scenarioExpiry
            }
          }),
        }).then(r => r.json());

        if (!submitCreateRes.ok) throw new Error(submitCreateRes.error || 'Failed to submit create transaction');
        envelopeId = submitCreateRes.result;

        const createFee = submitCreateRes.feeCharged ? formatFee(submitCreateRes.feeCharged) : undefined;
        if (createFee) fees.push(createFee);

        addScenarioLog('create-submit', 'success', `Envelope #${envelopeId} created`, {
          hash: submitCreateRes.hash,
          explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitCreateRes.hash}`,
          elapsed: Date.now() - iterationStart,
          fee: createFee,
          iteration
        });

        // Step 3: Check Fund page integration (MVP envelope lookup)
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('fund-check', 'pending', 'Checking Fund page integration...', { iteration });
        
        // Add small delay to allow blockchain confirmation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        addScenarioLog('fund-check', 'info', `Fetching envelope ${envelopeId} from ${config.api.baseUrl}/api/envelope-mvp/${envelopeId}`, { iteration });
        
        const fundRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/${envelopeId}`);
        
        if (!fundRes.ok) {
          const errorText = await fundRes.text();
          addScenarioLog('fund-check', 'error', `Fund endpoint error: ${fundRes.status}`, { 
            status: fundRes.status,
            statusText: fundRes.statusText,
            response: errorText,
            iteration 
          });
          throw new Error(`Failed to fetch envelope from Fund endpoint: ${fundRes.status} - ${errorText}`);
        }
        
        const fundData = await fundRes.json();
        
        addScenarioLog('fund-check', 'info', `Fund endpoint response`, { 
          response: fundData,
          iteration 
        });
        
        if (!fundData.ok || !fundData.envelope) {
          throw new Error(`Invalid envelope data from Fund endpoint: ${JSON.stringify(fundData)}`);
        }
        
        const envelope = fundData.envelope;
        if (envelope.status !== 'FUNDED') throw new Error(`Expected FUNDED status, got ${envelope.status}`);
        if (!envelope.isMvp) throw new Error('Expected MVP envelope flag');
        
        addScenarioLog('fund-check', 'success', 'Fund page integration verified', {
          status: envelope.status,
          isMvp: envelope.isMvp,
          claimUrl: envelope.claimUrl,
          elapsed: Date.now() - iterationStart,
          iteration
        });

        // Step 4: Claim/Open envelope
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('claim', 'pending', 'Building claim transaction...', { iteration });
        const claimRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: envelopeId,
            recipient: address,
          }),
        }).then(r => r.json());

        if (!claimRes.ok) throw new Error(claimRes.error || 'Failed to build claim transaction');

        // Sign claim transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('claim-sign', 'pending', 'Please sign claim transaction in Freighter...', { iteration });
        const claimSignStart = Date.now();
        const signedClaimXdr = await freighterApi.signTransaction(claimRes.xdr, { networkPassphrase: claimRes.network });
        signTimeMs += Date.now() - claimSignStart;
        if (!signedClaimXdr || signedClaimXdr.error) throw new Error('Failed to sign claim transaction');

        // Submit claim transaction
        if (abortRef.current) throw new Error('Aborted by user');
        addScenarioLog('claim-submit', 'pending', 'Submitting claim transaction...', { iteration });
        const submitClaimRes = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            xdr: signedClaimXdr.signedTxXdr || signedClaimXdr,
            signer: address
          }),
        }).then(r => r.json());

        if (!submitClaimRes.ok) throw new Error(submitClaimRes.error || 'Failed to submit claim transaction');

        const claimFee = submitClaimRes.feeCharged ? formatFee(submitClaimRes.feeCharged) : undefined;
        if (claimFee) fees.push(claimFee);

        addScenarioLog('claim-submit', 'success', `Envelope claimed! Amount: ${submitClaimRes.result}`, {
          hash: submitClaimRes.hash,
          explorerUrl: `https://stellar.expert/explorer/testnet/tx/${submitClaimRes.hash}`,
          elapsed: Date.now() - iterationStart,
          fee: claimFee,
          iteration
        });

        // Check final balances
        const afterBalances = await checkBalances(address);
        if (iteration === scenarioRepeat || abortRef.current) {
          setBalances(prev => ({ ...prev, after: afterBalances }));
        }

        // Track iteration success
        const totalTimeMs = Date.now() - iterationStart;
        setScenarioStats(prev => {
          const newIteration = {
            index: iteration,
            success: true,
            totalTimeMs,
            signTimeMs,
            fees,
            error: undefined
          };
          const iterations = [...prev.iterations, newIteration];
          const times = iterations.map(i => i.totalTimeMs);
          const signTimes = iterations.map(i => i.signTimeMs);

          return {
            ...prev,
            total: prev.total + 1,
            succeeded: prev.succeeded + 1,
            iterations,
            avgTimeMs: times.reduce((a, b) => a + b, 0) / times.length,
            p95TimeMs: calculateP95(times),
            avgSignTimeMs: signTimes.reduce((a, b) => a + b, 0) / signTimes.length,
            p95SignTimeMs: calculateP95(signTimes)
          };
        });

        addScenarioLog('iteration', 'success', `E2E run ${iteration} completed successfully`, {
          iteration,
          elapsed: totalTimeMs,
          envelopeId,
          fees: fees.join(', ')
        });

      } catch (error: any) {
        const errorMsg = error.message || 'E2E scenario failed';
        
        // Track iteration failure
        const totalTimeMs = Date.now() - iterationStart;
        setScenarioStats(prev => {
          const newIteration = {
            index: iteration,
            success: false,
            totalTimeMs,
            signTimeMs,
            fees,
            error: errorMsg
          };
          return {
            ...prev,
            total: prev.total + 1,
            failed: prev.failed + 1,
            iterations: [...prev.iterations, newIteration]
          };
        });

        addScenarioLog('iteration', 'error', `E2E run ${iteration} failed: ${errorMsg}`, {
          iteration,
          elapsed: totalTimeMs,
          error: errorMsg,
          envelopeId
        });

        if (abortRef.current) break; // Exit loop if user aborted
      }
    }

    setScenarioRunning(null);
    
    // Final summary
    addScenarioLog('summary', 'info', 'End-to-End MVP flow completed', {
      total: scenarioStats.total + (scenarioStats.succeeded + scenarioStats.failed),
      succeeded: scenarioStats.succeeded,
      failed: scenarioStats.failed
    });
  };

  // Test signing using the production fallback path
  const testFallbackSign = useCallback(async (xdr: string) => {
    try {
      const pk = publicKey || (await freighterApi.getAddress()).address;
      addLog('info', 'Testing production fallback path...');

      const result = await freighterApi.signTransaction(xdr, {
        networkPassphrase: NET,
        accountToSign: pk
      });

      if (result.signedTxXdr) {
        addLog('success', 'Fallback sign success (production path)', {
          signedTxXdr: result.signedTxXdr.substring(0, 50) + '...',
          fullSuccess: true
        });
      } else if (result.error) {
        addLog('error', 'Fallback sign failed', { error: result.error });
      }
    } catch (e: unknown) {
      addLog('error', 'Fallback sign exception', e);
    }
  }, [addLog, publicKey]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Freighter Diagnostics</h1>

      <Section title="Environment">
        <div className="text-sm text-gray-700 space-y-1">
          <p>window.freighterApi: <span className="font-mono">{String(!!freighterGlobal)}</span></p>
          <p>Public Key: <span className="font-mono">{toDisplay(publicKey)}</span></p>
          <p>Network Passphrase: <span className="font-mono">{toDisplay(network)}</span></p>
          {environment && (
            <>
              <p>Browser: <span className="font-mono">{environment.browser}</span></p>
              <p>Platform: <span className="font-mono">{environment.platform}</span></p>
              <p>Origin: <span className="font-mono">{environment.siteOrigin}</span></p>
            </>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button className="px-3 py-2 bg-purple-600 text-white rounded" onClick={runHandshake}>
              Run Handshake
            </button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={captureEnvironment}>
              Capture Environment
            </button>
          </div>
        </div>
      </Section>

      <Section title="Classic Control">
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={buildClassic}>
              Build Classic XDR
            </button>
            <button
              className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              disabled={!classicXdr}
              onClick={() => testGlobalSign(classicXdr)}
            >
              Sign via Global API
            </button>
            <button
              className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
              disabled={!classicXdr}
              onClick={() => testFallbackSign(classicXdr)}
            >
              Sign via Fallback (Prod)
            </button>
          </div>
          <textarea
            className="w-full h-24 border rounded p-2 text-sm"
            value={classicXdr}
            onChange={(e) => setClassicXdr(e.target.value)}
            placeholder="Classic XDR"
          />
        </div>
      </Section>

      <Section title="Soroban Build & Sign">
        <div className="space-y-2">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset (C...)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              placeholder="C..."
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={buildSoroban}>
              Build Soroban XDR
            </button>
            <button
              className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              disabled={!soroXdr}
              onClick={() => testGlobalSign(soroXdr)}
            >
              Sign via Global API
            </button>
            <button
              className="px-3 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
              disabled={!soroXdr}
              onClick={() => testFallbackSign(soroXdr)}
            >
              Sign via Fallback (Prod)
            </button>
          </div>
          <textarea
            className="w-full h-24 border rounded p-2 text-sm"
            value={soroXdr}
            onChange={(e) => setSoroXdr(e.target.value)}
            placeholder="Soroban XDR"
          />
          {soroInspect && (
            <pre className="bg-gray-50 border rounded p-2 text-xs overflow-auto">
              {JSON.stringify({
                prepared: soroInspect.prepared,
                envelopeType: soroInspect.envelopeType,
                ops: soroInspect.ops
              }, null, 2)}
            </pre>
          )}
        </div>
      </Section>

      <Section title="Telemetry (Dev Only)">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Signing path metrics (no PII collected)</p>
          <div className="flex gap-2 flex-wrap">
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded"
              onClick={() => {
                const metrics = (window as any).__novaFreighterMetrics?.get();
                if (metrics) {
                  addLog('info', 'Current metrics', metrics);
                  console.log('Signing metrics:', metrics);
                } else {
                  addLog('warn', 'No metrics available');
                }
              }}
            >
              Show Metrics
            </button>
            <button
              className="px-3 py-2 bg-green-600 text-white rounded"
              onClick={() => {
                (window as any).__novaFreighterMetrics?.export();
                addLog('success', 'Metrics exported to file');
              }}
            >
              Export Telemetry (JSON)
            </button>
            <button
              className="px-3 py-2 bg-red-600 text-white rounded"
              onClick={() => {
                (window as any).__novaFreighterMetrics?.reset();
                addLog('info', 'Metrics reset');
              }}
            >
              Reset Metrics
            </button>
          </div>
          <div className="text-xs bg-gray-50 border rounded p-2">
            <button
              className="text-blue-600 underline"
              onClick={() => {
                const metrics = (window as any).__novaFreighterMetrics?.get();
                if (metrics) {
                  const summary = `Global: ${metrics.globalApiSuccesses}/${metrics.globalApiAttempts} | Package: ${metrics.packageSuccesses}/${metrics.packageAttempts} | Last: ${metrics.lastPathUsed || 'none'}`;
                  addLog('info', summary);
                }
              }}
            >
              Quick Summary
            </button>
          </div>
        </div>
      </Section>

      {/* Automated Scenarios - Dev Only */}
      {process.env.NODE_ENV === 'development' && (
        <Section title="Automated Scenarios">
          <div className="space-y-4">
            {/* Configuration */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  value={scenarioAmount}
                  onChange={(e) => setScenarioAmount(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  disabled={!!scenarioRunning}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Expiry (seconds)</label>
                <input
                  type="number"
                  value={scenarioExpiry}
                  onChange={(e) => setScenarioExpiry(parseInt(e.target.value) || 60)}
                  className="w-full px-2 py-1 border rounded text-sm"
                  disabled={!!scenarioRunning}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Repeat</label>
                <input
                  type="number"
                  value={scenarioRepeat}
                  onChange={(e) => setScenarioRepeat(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  min="1"
                  max="10"
                  className="w-full px-2 py-1 border rounded text-sm"
                  disabled={!!scenarioRunning}
                />
              </div>
            </div>

            {/* Scenario Buttons */}
            <div className="flex gap-2">
              <button
                onClick={runCreateRefundScenario}
                disabled={!!scenarioRunning}
                className={`px-3 py-2 rounded text-white ${
                  scenarioRunning === 'create-refund'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {scenarioRunning === 'create-refund' ? 'Running...' : 'Create → Refund'}
              </button>
              <button
                onClick={runCreateOpenScenario}
                disabled={!!scenarioRunning}
                className={`px-3 py-2 rounded text-white ${
                  scenarioRunning === 'create-open'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {scenarioRunning === 'create-open' ? 'Running...' : 'Create → Open'}
              </button>
              <button
                onClick={runEndToEndFlow}
                disabled={!!scenarioRunning}
                className={`px-3 py-2 rounded text-white ${
                  scenarioRunning === 'e2e-flow'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {scenarioRunning === 'e2e-flow' ? 'Running...' : 'End-to-End MVP Flow'}
              </button>
              {scenarioRunning && (
                <button
                  onClick={stopScenario}
                  className="px-3 py-2 rounded text-white bg-red-600 hover:bg-red-700"
                >
                  Stop
                </button>
              )}
            </div>

            {/* Countdown */}
            {countdown > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm font-medium text-yellow-800">
                  Waiting for expiry: {countdown}s
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full transition-all"
                    style={{ width: `${((scenarioExpiry - countdown) / scenarioExpiry) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Balance Panel */}
            <div className="bg-gray-50 rounded p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Balances</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-gray-600 mb-1">Before</p>
                  <div className="space-y-1">
                    <p>XLM: <span className="font-mono">{balances.before.xlm}</span></p>
                    <p>WXLM: <span className="font-mono">{balances.before.wxlm}</span></p>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-600 mb-1">After</p>
                  <div className="space-y-1">
                    <p>XLM: <span className="font-mono">{balances.after.xlm}</span></p>
                    <p>WXLM: <span className="font-mono">{balances.after.wxlm}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario Logs */}
            {scenarioLogs.length > 0 && (
              <div className="bg-gray-50 rounded p-3 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Scenario Progress</h4>
                  <button
                    onClick={() => setScenarioLogs([])}
                    className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1">
                  {scenarioLogs.map((log, idx) => (
                    <div key={idx} className="text-xs flex items-center">
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 flex-shrink-0 ${
                        log.status === 'success' ? 'bg-green-500' :
                        log.status === 'error' ? 'bg-red-500' :
                        log.status === 'skipped' ? 'bg-gray-400' :
                        'bg-yellow-500 animate-pulse'
                      }`} />
                      <span className="font-mono text-gray-600">{log.step}</span>
                      {log.iteration !== undefined && <span className="text-gray-500 ml-1">[{log.iteration}]</span>}
                      {' - '}
                      <span>{log.message}</span>
                      {log.fee && (
                        <span className="text-green-600 ml-2">~{log.fee}</span>
                      )}
                      {log.elapsed && (
                        <span className="text-gray-500 ml-2">({log.elapsed}ms)</span>
                      )}
                      {log.explorerUrl && (
                        <>
                          <a
                            href={log.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline ml-2"
                          >
                            [Tx]
                          </a>
                          <button
                            onClick={() => copyToClipboard(log.explorerUrl!, 'Link')}
                            className="text-blue-600 hover:underline ml-1"
                          >
                            [Copy]
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            {scenarioStats.total > 0 && (
              <div className="bg-blue-50 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-blue-800">Statistics</h4>
                  <button
                    onClick={() => {
                      const summary = [
                        `Scenario: ${scenarioRunning || 'Completed'}`,
                        `Amount: ${scenarioAmount}, Expiry: ${scenarioExpiry}s, Repeat: ${scenarioRepeat}`,
                        `Total: ${scenarioStats.total}, Success: ${scenarioStats.succeeded}, Failed: ${scenarioStats.failed}, Skipped: ${scenarioStats.skipped}`,
                        `Avg Total: ${Math.round(scenarioStats.avgTimeMs)}ms, P95 Total: ${Math.round(scenarioStats.p95TimeMs)}ms`,
                        `Avg Sign: ${Math.round(scenarioStats.avgSignTimeMs)}ms, P95 Sign: ${Math.round(scenarioStats.p95SignTimeMs)}ms`,
                        '',
                        'Recent transactions:',
                        ...scenarioLogs.filter(l => l.hash).slice(-5).map(l =>
                          `- ${l.step}: https://stellar.expert/explorer/testnet/tx/${l.hash}`
                        )
                      ].join('\n');
                      copyToClipboard(summary, 'Summary');
                    }}
                    className="text-xs px-2 py-1 bg-blue-200 rounded hover:bg-blue-300"
                  >
                    Copy Summary
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Runs</p>
                    <div className="space-y-1">
                      <p>Total: <span className="font-mono">{scenarioStats.total}</span></p>
                      <p>Success: <span className="font-mono text-green-600">{scenarioStats.succeeded}</span></p>
                      <p>Failed: <span className="font-mono text-red-600">{scenarioStats.failed}</span></p>
                      {scenarioStats.skipped > 0 && (
                        <p>Skipped: <span className="font-mono text-gray-600">{scenarioStats.skipped}</span></p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Total Time</p>
                    <div className="space-y-1">
                      <p>Avg: <span className="font-mono">{Math.round(scenarioStats.avgTimeMs)}ms</span></p>
                      <p>P95: <span className="font-mono">{Math.round(scenarioStats.p95TimeMs)}ms</span></p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-1">Sign Time</p>
                    <div className="space-y-1">
                      <p>Avg: <span className="font-mono">{Math.round(scenarioStats.avgSignTimeMs)}ms</span></p>
                      <p>P95: <span className="font-mono">{Math.round(scenarioStats.p95SignTimeMs)}ms</span></p>
                    </div>
                  </div>
                </div>
                {scenarioStats.iterations.filter(i => !i.success).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <p className="text-xs font-medium text-red-700 mb-1">Failed Iterations:</p>
                    {scenarioStats.iterations.filter(i => !i.success).map((iter, idx) => (
                      <p key={idx} className="text-xs text-red-600">
                        Run {iter.index}: {iter.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      <Section title="Logs">
        <div className="space-y-2">
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setLogs([])}>
            Clear
          </button>
          <div className="text-xs font-mono whitespace-pre-wrap bg-gray-50 border rounded p-2 max-h-96 overflow-auto">
            {logs.map((l, idx) => (
              <div
                key={idx}
                className={{
                  info: 'text-gray-700',
                  warn: 'text-yellow-700',
                  error: 'text-red-700',
                  success: 'text-green-700'
                }[l.level]}
              >
                [{l.ts}] {l.level.toUpperCase()}: {l.text}
                {l.data !== undefined ? ' ' + JSON.stringify(l.data) : ''}
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}