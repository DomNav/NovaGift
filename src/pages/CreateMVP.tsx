import { useState } from 'react';
import { ensureFreighter, signXdrWithFreighter } from '@/lib/wallet';
import { useToast } from '@/hooks/useToast';
import { config } from '@/config';
import { XLM_CONTRACT_ID } from '@/config/stellar';

export default function CreateMVP() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [envelopeId, setEnvelopeId] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');

  // Form fields
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('1');
  const [expiryHours, setExpiryHours] = useState<number>(24);

  async function create() {
    setLoading(true);
    setError('');
    setEnvelopeId('');
    setTxHash('');

    try {
      const creator = await ensureFreighter();
      const finalRecipient = recipient || creator;

      const b = await fetch(`${config.api.baseUrl}/api/envelope-mvp/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator,
          recipient: finalRecipient,
          asset: XLM_CONTRACT_ID,
          amount,
          denom: 'USD',
          expiry_secs: expiryHours * 3600,
        }),
      }).then((r) => r.json());

      if (!b.ok) throw new Error(b.error || 'Failed to build transaction');

      const signedXdr = await signXdrWithFreighter(b.xdr, b.network);

      const s = await fetch(`${config.api.baseUrl}/api/envelope-mvp/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xdr: signedXdr,
          signer: creator,
          metadata: {
            creator,
            recipient: finalRecipient,
            asset: XLM_CONTRACT_ID,
            amount,
            denom: 'USD',
            expiry_secs: expiryHours * 3600
          }
        }),
      }).then((r) => r.json());

      if (!s.ok) throw new Error(s.error || 'Failed to submit transaction');

      setTxHash(s.hash);

      if (s.result != null) {
        setEnvelopeId(String(s.result));
        addToast(`Envelope #${String(s.result)} created!`, 'success');
      } else {
        addToast('Envelope created. (ID will be parsed from tx result/events)', 'success');
      }
    } catch (e: any) {
      setError(e?.message || 'Create failed');
      addToast(e?.message || 'Failed to create envelope', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Create Gift Envelope (Freighter)
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Address (optional)</label>
              <input
                type="text"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="G... (leave empty to send to yourself)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (XLM)</label>
              <input
                type="number"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="1.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                min="0.0000001"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (hours)</label>
              <input
                type="number"
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={expiryHours}
                onChange={(e) => setExpiryHours(parseInt(e.target.value) || 0)}
                disabled={loading}
                min="0"
                step="1"
              />
              <p className="text-xs text-gray-500 mt-1">Set to 0 for no expiry</p>
            </div>

            <button
              className="w-full p-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={create}
              disabled={loading || !amount}
            >
              {loading ? 'Creating...' : 'Create with Freighter'}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">{error}</div>
            )}

            {txHash && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Success!</h3>
                <div className="space-y-1 text-sm">
                  <div className="text-gray-700">
                    <span className="font-medium">Transaction:</span> {txHash.substring(0, 10)}...
                  </div>
                  <a
                    className="inline-block mt-2 text-purple-600 hover:text-purple-800 underline"
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Stellar Expert
                  </a>
                </div>
                {envelopeId && (
                  <div className="text-gray-700 mt-2">
                    <span className="font-medium">Envelope ID:</span> {envelopeId}
                    <br />
                    <a className="text-purple-600 hover:text-purple-800 underline" href={`/claim-mvp/${envelopeId}`}>
                      Claim Link
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/claim-mvp/1" className="text-purple-600 hover:text-purple-800 underline text-sm">
            Test Claim (ID: 1)
          </a>
        </div>
      </div>
    </div>
  );
}
