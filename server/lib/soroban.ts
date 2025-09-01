import {
  Address,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative,
  Networks
} from "@stellar/stellar-sdk";
import { Server, Api, assembleTransaction } from "@stellar/stellar-sdk/rpc";

const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || Networks.TESTNET;

export const scAddress = (address: string) => new Address(address);

export async function buildInvokeTx(
  source: string,
  contractId: string,
  method: string,
  args: xdr.ScVal[]
): Promise<string> {
  const server = new Server(SOROBAN_RPC_URL);
  const sourceAccount = await server.getAccount(source);
  
  const contract = new Contract(contractId);
  const operation = contract.call(method, ...args);
  
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();
  
  const simulated = await server.simulateTransaction(transaction);
  
  if (Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }
  
  const prepared = assembleTransaction(
    transaction,
    simulated
  ).build();
  
  return prepared.toXDR();
}

export function parseClaimResult(xdrString: string): {
  recipient: string;
  asset: { code: string; issuer?: string };
  amount: string;
} {
  const result = xdr.ScVal.fromXDR(xdrString, "base64");
  const native = scValToNative(result);
  
  return {
    recipient: native.recipient,
    asset: {
      code: native.asset.code,
      issuer: native.asset.issuer || undefined
    },
    amount: native.amount.toString()
  };
}