// TODO: consolidate with server/src/lib/rpc.ts when a generic view helper exists
import { Address, SorobanRpc, xdr, scValToNative } from "@stellar/stellar-sdk";
import { config } from "../config";

const KALE_ID = process.env.KALE_CONTRACT_ID ?? "";
const USE_FAKE = String(process.env.KALE_FAKE_BALANCE || "false") === "true";

async function readContractView(
  contractId: string,
  method: string, 
  args: xdr.ScVal[]
): Promise<any> {
  const server = new SorobanRpc.Server(config.sorobanRpcUrl);
  
  // Build the contract call
  const contractAddress = Address.fromString(contractId);
  const fn = xdr.ScSymbol.fromString(method);
  
  // Create the invoke contract host function
  const invokeContractArgs = xdr.ScVal.scvVec([
    contractAddress.toScVal(),
    xdr.ScVal.scvSymbol(fn.toString()),
    xdr.ScVal.scvVec(args)
  ]);
  
  try {
    // Simulate the contract call
    const response = await server.simulateTransaction(
      new SorobanRpc.Transaction(
        xdr.TransactionEnvelope.envelopeTypeTx(
          new xdr.TransactionV1Envelope({
            tx: new xdr.Transaction({
              sourceAccount: xdr.MuxedAccount.keyTypeEd25519(
                Buffer.alloc(32) // dummy source
              ),
              fee: xdr.Uint32.fromNumber(100),
              seqNum: xdr.SequenceNumber.fromString("0"),
              timeBounds: null,
              memo: xdr.Memo.memoNone(),
              operations: [
                new xdr.Operation({
                  sourceAccount: null,
                  body: xdr.OperationBody.invokeHostFunction(
                    new xdr.InvokeHostFunctionOp({
                      hostFunction: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        invokeContractArgs
                      ),
                      auth: []
                    })
                  )
                })
              ],
              ext: xdr.TransactionExt.fromXDR(Buffer.alloc(0))
            }),
            signatures: []
          })
        ).toXDR()
      )
    );
    
    if (response.error) {
      console.error("Simulation error:", response.error);
      throw new Error(response.error);
    }
    
    // Extract the result
    if (response.results && response.results.length > 0) {
      const result = response.results[0];
      if ('xdr' in result) {
        const scVal = xdr.ScVal.fromXDR(result.xdr, 'base64');
        return scValToNative(scVal);
      }
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
    const res = await readContractView(KALE_ID, "balance_of", args);
    const n = typeof res === "string" ? Number(res) : Number(res ?? 0);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch (error) {
    console.error("Failed to read KALE balance:", error);
    return 0;
  }
}

function fakeBalance(pk: string): number {
  let h = 0; 
  for (const c of pk) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 13); // 0..12
}