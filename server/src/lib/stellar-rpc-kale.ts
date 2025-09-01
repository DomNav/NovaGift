// TODO: consolidate with server/src/lib/rpc.ts when a generic view helper exists
import { 
  Address, 
  xdr, 
  scValToNative, 
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Account
} from "@stellar/stellar-sdk";
import { Server, Api } from "@stellar/stellar-sdk/rpc";
import { config } from "../config";

const KALE_ID = process.env.KALE_CONTRACT_ID ?? "";
const USE_FAKE = String(process.env.KALE_FAKE_BALANCE || "false") === "true";

async function readContractView(
  contractId: string,
  method: string, 
  args: xdr.ScVal[]
): Promise<any> {
  const server = new Server(config.sorobanRpcUrl);
  
  // Create a dummy source account for simulation
  const sourceAccount = new Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "0"
  );
  
  // Build the contract and operation
  const contract = new Contract(contractId);
  const operation = contract.call(method, ...args);
  
  // Build transaction for simulation
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
  
  try {
    // Simulate the contract call
    const response = await server.simulateTransaction(transaction);
    
    if (Api.isSimulationError(response)) {
      console.error("Simulation error:", response.error);
      throw new Error(response.error);
    }
    
    // Extract the result
    if (response.result && response.result.retval) {
      return scValToNative(response.result.retval);
    }
    
    return 0;
  } catch (error) {
    console.error("Contract read error:", error);
    return 0;
  }
}

export async function getKaleBalanceFor(pubkey: string): Promise<number> {
  if (!KALE_ID || USE_FAKE) return fakeBalance(pubkey);
  
  // Build balance_of call args
  const args = [Address.fromString(pubkey).toScVal()];
  
  try {
    const balance = await readContractView(KALE_ID, "balance_of", args);
    return Number(balance ?? 0);
  } catch (err) {
    console.error("Failed to get KALE balance:", err);
    return 0;
  }
}

function fakeBalance(pubkey: string): number {
  const base = parseInt(pubkey.slice(-4), 16) % 100;
  return 10000000 + (base * 7919);
}