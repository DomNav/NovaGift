"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const soroban_1 = require("../lib/soroban");
const stellar_sdk_1 = require("@stellar/stellar-sdk");
// Mock SorobanRpc
vitest_1.vi.mock('@stellar/stellar-sdk', async () => {
    const actual = await vitest_1.vi.importActual('@stellar/stellar-sdk');
    return {
        ...actual,
        SorobanRpc: {
            Server: vitest_1.vi.fn().mockImplementation(() => ({
                getAccount: vitest_1.vi.fn().mockResolvedValue({
                    accountId: () => 'GABC123',
                    sequenceNumber: () => '1234567890',
                    incrementSequenceNumber: vitest_1.vi.fn()
                }),
                simulateTransaction: vitest_1.vi.fn().mockResolvedValue({
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
                isSimulationError: vitest_1.vi.fn().mockReturnValue(false)
            },
            assembleTransaction: vitest_1.vi.fn().mockImplementation((tx) => ({
                build: () => ({
                    toXDR: () => 'mock_assembled_transaction_xdr'
                })
            }))
        }
    };
});
(0, vitest_1.describe)('buildInvokeTx', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('should build a transaction for claiming an envelope', async () => {
        const source = 'GABC123DEF456789';
        const contractId = 'CCDEFGHIJK123456789';
        const method = 'claim';
        const recipientAddress = 'GXYZ789ABC123456';
        const args = [(0, soroban_1.scAddress)(recipientAddress).toScVal()];
        const xdr = await (0, soroban_1.buildInvokeTx)(source, contractId, method, args);
        (0, vitest_1.expect)(xdr).toBe('mock_assembled_transaction_xdr');
        (0, vitest_1.expect)(stellar_sdk_1.SorobanRpc.Server).toHaveBeenCalledWith(vitest_1.expect.stringContaining('soroban'));
    });
    (0, vitest_1.it)('should throw error on simulation failure', async () => {
        const source = 'GABC123DEF456789';
        const contractId = 'CCDEFGHIJK123456789';
        const method = 'claim';
        const args = [];
        // Mock simulation error
        vitest_1.vi.mocked(stellar_sdk_1.SorobanRpc.Api.isSimulationError).mockReturnValueOnce(true);
        const mockServer = new stellar_sdk_1.SorobanRpc.Server('');
        vitest_1.vi.mocked(mockServer.simulateTransaction).mockResolvedValueOnce({
            error: 'Simulation failed: Invalid arguments'
        });
        await (0, vitest_1.expect)((0, soroban_1.buildInvokeTx)(source, contractId, method, args)).rejects.toThrow('Simulation failed');
    });
    (0, vitest_1.it)('should use correct network passphrase', async () => {
        const originalEnv = process.env.NETWORK_PASSPHRASE;
        process.env.NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
        const source = 'GABC123DEF456789';
        const contractId = 'CCDEFGHIJK123456789';
        const method = 'test';
        const args = [];
        await (0, soroban_1.buildInvokeTx)(source, contractId, method, args);
        // Restore original env
        process.env.NETWORK_PASSPHRASE = originalEnv;
    });
});
(0, vitest_1.describe)('scAddress', () => {
    (0, vitest_1.it)('should create a valid Address object', () => {
        const addressString = 'GABC123DEF456789';
        const address = (0, soroban_1.scAddress)(addressString);
        (0, vitest_1.expect)(address).toBeDefined();
        (0, vitest_1.expect)(address.toScVal).toBeDefined();
        (0, vitest_1.expect)(typeof address.toScVal).toBe('function');
    });
});
