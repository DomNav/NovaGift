import type { EnvelopeRecord, EnvelopeStore, JtiRecord } from './types';

// TODO: Swap to SQLite via Prisma for persistence
// This in-memory store is for MVP speed of development
export class MemoryStore implements EnvelopeStore {
  private envelopes = new Map<string, EnvelopeRecord>();
  private jtis = new Map<string, JtiRecord>();

  async create(record: EnvelopeRecord): Promise<void> {
    if (this.envelopes.has(record.id)) {
      throw new Error(`Envelope ${record.id} already exists`);
    }
    this.envelopes.set(record.id, record);
  }

  async get(id: string): Promise<EnvelopeRecord | null> {
    return this.envelopes.get(id) || null;
  }

  async markFunded(id: string, txId: string): Promise<void> {
    const envelope = this.envelopes.get(id);
    if (!envelope) {
      throw new Error(`Envelope ${id} not found`);
    }
    if (envelope.status !== 'CREATED') {
      throw new Error(`Envelope ${id} is not in CREATED state`);
    }
    envelope.status = 'FUNDED';
    envelope.funded_at = Date.now();
    envelope.funded_txid = txId;
    this.envelopes.set(id, envelope);
  }

  async markOpened(
    id: string,
    txId: string,
    recipient: string,
    delivered: { asset: string; amount: string }
  ): Promise<void> {
    const envelope = this.envelopes.get(id);
    if (!envelope) {
      throw new Error(`Envelope ${id} not found`);
    }
    if (envelope.status !== 'FUNDED') {
      throw new Error(`Envelope ${id} is not in FUNDED state`);
    }
    envelope.status = 'OPENED';
    envelope.opened_at = Date.now();
    envelope.opened_txid = txId;
    envelope.recipient = recipient;
    envelope.asset_delivered = delivered.asset;
    envelope.amount_delivered = delivered.amount;
    this.envelopes.set(id, envelope);
  }

  async markCanceled(id: string, txId: string): Promise<void> {
    const envelope = this.envelopes.get(id);
    if (!envelope) {
      throw new Error(`Envelope ${id} not found`);
    }
    if (envelope.status === 'OPENED' || envelope.status === 'CANCELED') {
      throw new Error(`Envelope ${id} cannot be canceled in ${envelope.status} state`);
    }
    envelope.status = 'CANCELED';
    envelope.canceled_at = Date.now();
    envelope.canceled_txid = txId;
    this.envelopes.set(id, envelope);
  }

  async useJtiOnce(jti: string, envelopeId: string): Promise<boolean> {
    if (this.jtis.has(jti)) {
      return false; // Already used
    }
    this.jtis.set(jti, {
      jti,
      used_at: Date.now(),
      envelope_id: envelopeId,
    });
    return true;
  }

  async isJtiUsed(jti: string): Promise<boolean> {
    return this.jtis.has(jti);
  }

  async cleanupExpired(): Promise<void> {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;
    
    // Clean up expired JTIs (older than 30 minutes)
    for (const [jti, record] of this.jtis.entries()) {
      if (now - record.used_at > thirtyMinutes) {
        this.jtis.delete(jti);
      }
    }
    
    // TODO: In production, also clean up very old envelopes
    // For MVP, keep all envelopes in memory
  }
}

// Singleton instance
export const store = new MemoryStore();

// Start cleanup interval
setInterval(() => {
  store.cleanupExpired().catch(console.error);
}, 5 * 60 * 1000); // Every 5 minutes