import { useEffect, useState } from "react";
import { connectWallet, ensureFreighter } from "../lib/wallet";

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureFreighter().then(setReady);
  }, []);

  const connect = async () => {
    const pub = await connectWallet();
    setAddress(pub);
    localStorage.setItem('wallet_address', pub);
    return pub;
  };

  return { ready, address, connect };
}