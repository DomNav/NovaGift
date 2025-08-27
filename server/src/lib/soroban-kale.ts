import { getKaleBalanceFor } from "./stellar-rpc-kale";

export async function getKaleHoldings(publicKey: string): Promise<number> {
  const bal = await getKaleBalanceFor(publicKey);
  return Math.max(0, bal);
}