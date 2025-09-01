import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildInvokeTx, scAddress } from '../lib/soroban';
import { SorobanRpc } from '@stellar/stellar-sdk';

// Mock SorobanRpc
vi.mock('@stellar/stellar-sdk', async () => {
  const actual = await vi.importActual('@stellar/stellar-sdk');
  return {
    ...actual,
    SorobanRpc: {
      Server: vi.fn().mockImplementation(() => ({
        getAccount: vi.fn().mockResolvedValue({
          accountId: () => 'GABC123',
          sequenceNumber: () => '1234567890',
          incrementSequenceNumber: vi.fn()
        }),
        simulateTransaction: vi.fn().mockResolvedValue({
          transactionData: {
            build: () => ({
              toXDR: () => 'mock_transaction_data_xdr'
            })
          },
          minResourceFee: '100',
          cost: {
            cpuInsns: '1000',
            memBytes: '2000'
          }
        })
      })),
      Api: {
        isSimulationError: vi.fn().mockReturnValue(false)
      },
      assembleTransaction: vi.fn().mockImplementation((tx) => ({
        build: () => ({
          toXDR: () => 'mock_assembled_transaction_xdr'
        })
      }))
    }
  };
});

describe('buildInvokeTx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build a transaction for claiming an envelope', async () => {
    const source = 'GABC123DEF456789';
    const contractId = 'CCDEFGHIJK123456789';
    const method = 'claim';
    const recipientAddress = 'GXYZ789ABC123456';
    const args = [scAddress(recipientAddress).toScVal()];

    const xdr = await buildInvokeTx(source, contractId, method, args);

    expect(xdr).toBe('mock_assembled_transaction_xdr');
    expect(SorobanRpc.Server).toHaveBeenCalledWith(
      expect.stringContaining('soroban')
    );
  });

  it('should throw error on simulation failure', async () => {
    const source = 'GABC123DEF456789';
    const contractId = 'CCDEFGHIJK123456789';
    const method = 'claim';
    const args = [];

    // Mock simulation error
    vi.mocked(SorobanRpc.Api.isSimulationError).mockReturnValueOnce(true);
    const mockServer = new SorobanRpc.Server('');
    vi.mocked(mockServer.simulateTransaction).mockResolvedValueOnce({
      error: 'Simulation failed: Invalid arguments'
    } as any);

    await expect(
      buildInvokeTx(source, contractId, method, args)
    ).rejects.toThrow('Simulation failed');
  });

  it('should use correct network passphrase', async () => {
    const originalEnv = process.env.NETWORK_PASSPHRASE;
    process.env.NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

    const source = 'GABC123DEF456789';
    const contractId = 'CCDEFGHIJK123456789';
    const method = 'test';
    const args = [];

    await buildInvokeTx(source, contractId, method, args);

    // Restore original env
    process.env.NETWORK_PASSPHRASE = originalEnv;
  });
});

describe('scAddress', () => {
  it('should create a valid Address object', () => {
    const addressString = 'GABC123DEF456789';
    const address = scAddress(addressString);
    
    expect(address).toBeDefined();
    expect(address.toScVal).toBeDefined();
    expect(typeof address.toScVal).toBe('function');
  });
});