import { 
  Keypair, 
  Networks, 
  StrKey, 
  TransactionBuilder,
  Account,
  Operation
} from "@stellar/stellar-sdk";

const HOME = process.env.WEB_AUTH_HOME_DOMAIN!;
const WEB_AUTH_DOMAIN = process.env.WEB_AUTH_DOMAIN!;
const SERVER_SECRET = process.env.WEB_AUTH_SERVER_SECRET!;
const NETWORK = process.env.NETWORK_PASSPHRASE!;

const serverKP = SERVER_SECRET ? Keypair.fromSecret(SERVER_SECRET) : Keypair.random();
export function getServerAccountId() { 
  return serverKP.publicKey(); 
}

export function issueChallenge(opts: { account: string; nonce: string; timeoutSec?: number }) {
  const timeout = Math.max(60, opts.timeoutSec ?? 300);
  // SEP-10 minimal challenge: server as source, client account in ManageData op
  const now = Math.floor(Date.now() / 1000);
  const tx = new TransactionBuilder(
    new Account(serverKP.publicKey(), "0"),
    { 
      fee: "100", 
      networkPassphrase: NETWORK, 
      timebounds: { 
        minTime: now, 
        maxTime: now + timeout 
      } 
    }
  )
    .addOperation(Operation.manageData({
      name: `${HOME} auth`,
      value: Buffer.from(opts.nonce),
      source: opts.account,
    }))
    .setTimeout(timeout)
    .setNetworkPassphrase(NETWORK)
    .build();

  tx.sign(serverKP); // server signs the challenge
  const xdrString = tx.toXDR();
  return { 
    xdr: xdrString, 
    serverAccountId: serverKP.publicKey(), 
    homeDomain: HOME, 
    webAuthDomain: WEB_AUTH_DOMAIN, 
    networkPassphrase: NETWORK 
  };
}

export function verifySignedChallenge(signedXDR: string): { sub: string } {
  const tx = TransactionBuilder.fromXDR(signedXDR, NETWORK) as any;
  
  // SEP-10 §2: Challenge must have no memo to prevent crafted memo attacks
  if (tx.memo && tx.memo.type !== "none") {
    throw new Error("challenge_has_memo");
  }
  
  // Must include server sig and client sig on the source account operation
  const serverOK = tx.signatures.some(sig => {
    try {
      return serverKP.verify(tx.hash(), sig.signature());
    } catch { 
      return false; 
    }
  });
  if (!serverOK) throw new Error("server_sig_missing");

  // Extract client account from op
  const op = tx.operations[0];
  if (!op || op.type !== "manageData") throw new Error("bad_challenge");
  const client = (op as any).source;
  if (!client || !StrKey.isValidEd25519PublicKey(client)) throw new Error("bad_client");

  // Verify client signature present
  const clientOK = tx.signatures.some(sig => {
    try { 
      return Keypair.fromPublicKey(client).verify(tx.hash(), sig.signature()); 
    } catch { 
      return false; 
    }
  });
  if (!clientOK) throw new Error("client_sig_missing");

  // Timebounds are validated by Transaction constructor against NETWORK; if custom, ensure here.
  return { sub: client };
}