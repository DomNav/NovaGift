import { Server, TransactionBuilder } from '@stellar/stellar-sdk';

type BuildResp = {
  xdr: string;
  networkPassphrase: string;
  horizonUrl: string;
  kind: 'payment' | 'create_account';
};

export async function sendXlmWithFreighter(input: {
  sourcePublicKey: string;
  destination: string;
  amount: string;
  memo?: string;
}) {
  const res = await fetch('/api/wallet/build-xlm-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Build failed: ${res.status}`);
  const { xdr, networkPassphrase, horizonUrl } = (await res.json()) as BuildResp;

  // @ts-ignore – provided by Freighter
  const signedXdr: string = await window.freighterApi.signTransaction(xdr, {
    networkPassphrase,
    accountToSign: input.sourcePublicKey,
  });

  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const server = new Server(horizonUrl);
  const result = await server.submitTransaction(tx);

  return { hash: result.hash, result };
}
