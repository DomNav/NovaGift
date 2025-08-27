import { describe, it, expect } from "vitest";
import { issueChallenge } from "../src/lib/sep10";

describe("SEP-10 challenge shapes", () => {
  it("issues a challenge XDR", () => {
    process.env.WEB_AUTH_HOME_DOMAIN = "test.domain";
    process.env.WEB_AUTH_DOMAIN = "auth.test.domain";
    process.env.WEB_AUTH_SERVER_SECRET = "SBFWVXZ4VFL3BNGVHJFHTCFQO2YTVGVR75LNVW57IJNJUHTGBW7F6JTM";
    process.env.NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    
    const { xdr, serverAccountId } = issueChallenge({ 
      account: "G".padEnd(56, "A"), 
      nonce: "abc" 
    });
    expect(xdr).toBeTypeOf("string");
    expect(serverAccountId).toMatch(/^G/);
  });
});