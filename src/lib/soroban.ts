import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  nativeToScVal,
  scValToNative,
  SorobanRpc,
  TransactionBuilder,
  TimeoutInfinite,
} from "soroban-client";
import { signXDR } from "./wallet";

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL as string;
const NETWORK_PASSPHRASE = (import.meta.env.VITE_NETWORK_PASSPHRASE ||
  Networks.TESTNET) as string;

const server = new SorobanRpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith("http:") });

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
  const signed = await signXDR(tx.toXDR(), NETWORK_PASSPHRASE);
  const send = await server.sendTransaction(SorobanRpc.TransactionBuilder.fromXDR(signed));
  if (send.status !== "PENDING" && send.status !== "SUCCESS") throw new Error(send.errorResultXdr ?? "send failed");

  const res = await server.getTransaction(send.hash);
  if (res.status !== SorobanRpc.GetTransactionStatus.SUCCESS) {
    throw new Error(`tx failed: ${res.status}`);
  }
  return res.result;
}

export function toNative(xdr: string) {
  return scValToNative(xdr as any);
}