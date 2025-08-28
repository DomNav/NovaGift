import {
  Asset,
  Horizon,
  TransactionBuilder,
  Operation,
  Memo,
} from "@stellar/stellar-sdk";

const HORIZON_URL = process.env.HORIZON_URL!;
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE!;
const server = new Horizon.Server(HORIZON_URL);

export async function buildXlmTransferXDR(params: {
  sourcePublicKey: string;
  destination: string;
  amount: string; // up to 7 decimals
  memo?: string;
}) {
  const { sourcePublicKey, destination, amount, memo } = params;

  // fetch source + base fee
  const [sourceAcc, baseFee] = await Promise.all([
    server.loadAccount(sourcePublicKey),
    server.fetchBaseFee(),
  ]);

  // does destination exist?
  let destExists = true;
  try {
    await server.loadAccount(destination);
  } catch {
    destExists = false;
  }

  const op = destExists
    ? Operation.payment({ destination, asset: Asset.native(), amount })
    : Operation.createAccount({ destination, startingBalance: amount });

  let tb = new TransactionBuilder(sourceAcc, {
    fee: String(baseFee),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(120);

  if (memo) tb = tb.addMemo(Memo.text(memo.slice(0, 28)));

  const tx = tb.build();
  return {
    xdr: tx.toXDR(),
    networkPassphrase: NETWORK_PASSPHRASE,
    horizonUrl: HORIZON_URL,
    kind: destExists ? "payment" : "create_account" as const,
  };
}