"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scAddress = void 0;
exports.buildInvokeTx = buildInvokeTx;
exports.parseClaimResult = parseClaimResult;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || stellar_sdk_1.Networks.TESTNET;
const scAddress = (address) => new stellar_sdk_1.Address(address);
exports.scAddress = scAddress;
async function buildInvokeTx(source, contractId, method, args) {
    const server = new stellar_sdk_1.SorobanRpc.Server(SOROBAN_RPC_URL);
    const sourceAccount = await server.getAccount(source);
    const contract = new stellar_sdk_1.Contract(contractId);
    const operation = contract.call(method, ...args);
    const transaction = new stellar_sdk_1.TransactionBuilder(sourceAccount, {
        fee: stellar_sdk_1.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
    })
        .addOperation(operation)
        .setTimeout(300)
        .build();
    const simulated = await server.simulateTransaction(transaction);
    if (stellar_sdk_1.SorobanRpc.Api.isSimulationError(simulated)) {
        throw new Error(`Simulation failed: ${simulated.error}`);
    }
    const prepared = stellar_sdk_1.SorobanRpc.assembleTransaction(transaction, simulated).build();
    return prepared.toXDR();
}
function parseClaimResult(xdr) {
    const result = xdr.ScVal.fromXDR(xdr, "base64");
    const native = (0, stellar_sdk_1.scValToNative)(result);
    return {
        recipient: native.recipient,
        asset: {
            code: native.asset.code,
            issuer: native.asset.issuer || undefined
        },
        amount: native.amount.toString()
    };
}
