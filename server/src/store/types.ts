export interface EnvelopeRecord {
  id: string;
  status: 'CREATED' | 'FUNDED' | 'OPENED' | 'CANCELED';
  asset: string;
  amount: string;
  decimals: number;
  sender: string;
  hash: string;
  expiry_ts: number;
  message?: string;
  open_jti?: string;
  open_url?: string;
  created_at: number;
  funded_at?: number;
  funded_txid?: string;
  opened_at?: number;
  opened_txid?: string;
  recipient?: string;
  asset_delivered?: string;
  amount_delivered?: string;
  canceled_at?: number;
  canceled_txid?: string;
}

export interface JtiRecord {
  jti: string;
  used_at: number;
  envelope_id: string;
}

export interface EnvelopeStore {
  // Envelope operations
  create(record: EnvelopeRecord): Promise<void>;
  get(id: string): Promise<EnvelopeRecord | null>;
  markFunded(id: string, txId: string): Promise<void>;
  markOpened(id: string, txId: string, recipient: string, delivered: { asset: string; amount: string }): Promise<void>;
  markCanceled(id: string, txId: string): Promise<void>;
  
  // JTI operations
  useJtiOnce(jti: string, envelopeId: string): Promise<boolean>;
  isJtiUsed(jti: string): Promise<boolean>;
  
  // Cleanup
  cleanupExpired(): Promise<void>;
}