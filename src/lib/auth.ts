import { signTransaction, isConnected, requestAccess, getAddress } from '@stellar/freighter-api';

export async function loginWithFreighter(): Promise<{ token: string; publicKey: string }> {
  if (!(await isConnected())) {
    await requestAccess();
  }
  const publicKey = await getAddress();

  // 1) Get challenge from server
  const ch = await fetch('/auth/sep10/challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: publicKey }),
  }).then((r) => r.json());

  // 2) Sign challenge XDR in wallet
  const signedXDR = await signTransaction(ch.xdr, {
    networkPassphrase: ch.networkPassphrase,
  });

  // 3) Verify with server → get JWT
  const v = await fetch('/auth/sep10/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signedXDR }),
  }).then((r) => r.json());

  return { token: v.token, publicKey: v.sub };
}
