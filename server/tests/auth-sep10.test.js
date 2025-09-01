"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sep10_1 = require("../src/lib/sep10");
(0, vitest_1.describe)("SEP-10 challenge shapes", () => {
    (0, vitest_1.it)("issues a challenge XDR", () => {
        process.env.WEB_AUTH_HOME_DOMAIN = "test.domain";
        process.env.WEB_AUTH_DOMAIN = "auth.test.domain";
        process.env.WEB_AUTH_SERVER_SECRET = "SBFWVXZ4VFL3BNGVHJFHTCFQO2YTVGVR75LNVW57IJNJUHTGBW7F6JTM";
        process.env.NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
        const { xdr, serverAccountId } = (0, sep10_1.issueChallenge)({
            account: "G".padEnd(56, "A"),
            nonce: "abc"
        });
        (0, vitest_1.expect)(xdr).toBeTypeOf("string");
        (0, vitest_1.expect)(serverAccountId).toMatch(/^G/);
    });
});
