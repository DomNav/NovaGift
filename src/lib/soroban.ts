import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  TimeoutInfinite,
  Transaction,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { signXDR } from "./wallet";

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = (import.meta.env.VITE_NETWORK_PASSPHRASE ||
  Networks.TESTNET) as string;

const server = new Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http:") });

export async function callContract({
  source,
  contractId,
  method,
  args,
}: {
  source: string;
  contractId: string;
  method: string;
  args: any[];
}) {
  const acc = await server.getAccount(source);
  const c = new Contract(contractId);

  const scArgs = args.map((a) =>
    a && a.__scval ? a :
    typeof a === "string" && a.startsWith("G")
      ? new Address(a).toScVal()
      : typeof a === "string"
      ? nativeToScVal(a, { type: "symbol" })
      : typeof a === "number"
      ? nativeToScVal(BigInt(a))
      : typeof a === "bigint"
      ? nativeToScVal(a)
      : a
  );

  let tx = new TransactionBuilder(acc, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(c.call(method, ...scArgs))
    .setTimeout(TimeoutInfinite)
    .build();

  tx = await server.prepareTransaction(tx);
  const signedResult = await signXDR(tx.toXDR(), NETWORK_PASSPHRASE);
  const signedTx = TransactionBuilder.fromXDR(signedResult.signedTxXdr, NETWORK_PASSPHRASE) as Transaction;
  const send = await server.sendTransaction(signedTx);
  
  if (send.status === "ERROR") {
    throw new Error(send.errorResult?.toString() ?? "send failed");
  }

  // Wait for transaction to complete
  let res = await server.getTransaction(send.hash);
  while (res.status === "NOT_FOUND") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    res = await server.getTransaction(send.hash);
  }
  
  if (res.status === "FAILED") {
    throw new Error(`tx failed: ${res.status}`);
  }
  
  // Return the transaction result
  return res;
}

export function toNative(xdr: string) {
  return scValToNative(xdr as any);
}