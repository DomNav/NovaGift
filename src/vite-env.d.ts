/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_ENABLE_AMM: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    nova?: {
      pubkey: string;
      signAndSubmit(xdr: string): Promise<{hash: string}>;
    };
  }
}
