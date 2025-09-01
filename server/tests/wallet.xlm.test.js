"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../src/server"));
describe("build-xlm-payment", () => {
    it("returns XDR", async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post("/api/wallet/build-xlm-payment")
            .send({
            sourcePublicKey: "GBTWWBOHCFT6MCJYDYRDCOU5XIK4WTLS6ETSWWZSKDH7LOQRR3UBCZLW",
            destination: "GDGPNWY6BTX2OXGEOEJRF7EJ3MSAFHADYTNLGZK6N6GJZYFSFN56VBKO",
            amount: "2",
            memo: "NovaGift",
        });
        expect(res.status).toBe(200);
        expect(typeof res.body.xdr).toBe("string");
    });
});
