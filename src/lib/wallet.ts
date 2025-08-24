import * as Freighter from "@stellar/freighter-api";

export async function ensureFreighter(): Promise<boolean> {
  return await Freighter.isConnected();
}

export async function connectWallet(): Promise<string> {
  const pub = await Freighter.getPublicKey();
  return pub;
}

export async function signXDR(xdr: string, networkPassphrase: string) {
  return await Freighter.signTransaction(xdr, { networkPassphrase });
}

export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}